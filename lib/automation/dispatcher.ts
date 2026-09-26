import "server-only";
import { createServiceClient, isSupabaseConfigured, type TypedSupabaseClient } from "@/lib/database/server";
import { notifyAdmin } from "@/lib/notifications/send";
import { absoluteUrl } from "@/lib/utils";
import type { Tables } from "@/types/database";
import { EVENT_LABELS, emitDomainEvent } from "./events";
import { computeScheduledFor, dedupeKey, EVENT_RELATIVE_TRIGGERS } from "./scheduling";
import { executeRun } from "./runner";

/**
 * Event-driven automation engine.
 *
 *   emitDomainEvent()  → row in domain_events (outbox)
 *   dispatchPendingDomainEvents() → for each unprocessed event, schedule an
 *        automation_run per matching enabled rule (idempotent via dedupe_key)
 *   runDueAutomations() → execute runs whose scheduled_for has passed
 *
 * Triggered right after requests via `after()` and every 15 minutes by Vercel
 * Cron (/api/cron/automations). To move to a queue (Inngest, Trigger.dev),
 * replace these two loops with queue consumers — the handlers stay the same.
 */
const MAX_EVENT_ATTEMPTS = 5;

type DomainEventRow = Tables<"domain_events">;

export async function dispatchPendingDomainEvents(db: TypedSupabaseClient, limit = 50): Promise<number> {
  const { data: events, error } = await db
    .from("domain_events")
    .select("*")
    .is("processed_at", null)
    .order("occurred_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Failed to read domain events: ${error.message}`);

  let processed = 0;
  for (const ev of events ?? []) {
    try {
      await scheduleRulesForEvent(db, ev);
      await runSystemHandler(db, ev);
      await db.from("domain_events").update({ processed_at: new Date().toISOString(), attempts: ev.attempts + 1, last_error: null }).eq("id", ev.id);
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[automation] event ${ev.type} ${ev.id} failed:`, message);
      await db
        .from("domain_events")
        .update({
          attempts: ev.attempts + 1,
          last_error: message.slice(0, 1000),
          processed_at: ev.attempts + 1 >= MAX_EVENT_ATTEMPTS ? new Date().toISOString() : null,
        })
        .eq("id", ev.id);
    }
  }
  return processed;
}

async function scheduleRulesForEvent(db: TypedSupabaseClient, ev: DomainEventRow) {
  const triggers = [ev.type];
  // A confirmed booking arms the event-relative reminders (7-day, 24-hour, brief).
  if (ev.type === "booking.confirmed") triggers.push("event.upcoming");

  const { data: rules, error } = await db.from("automation_rules").select("*").in("trigger_event", triggers).eq("is_enabled", true);
  if (error) throw new Error(`Failed to load rules: ${error.message}`);
  if (!rules?.length) return;

  let eventStartsAt: Date | null = null;
  if (ev.lead_id && rules.some((r) => EVENT_RELATIVE_TRIGGERS.has(r.trigger_event))) {
    const { data } = await db.from("leads").select("events!inner(starts_at)").eq("id", ev.lead_id).single();
    eventStartsAt = data ? new Date(data.events.starts_at) : null;
  }

  const now = Date.now();
  const rows = [];
  for (const rule of rules) {
    const relative = EVENT_RELATIVE_TRIGGERS.has(rule.trigger_event);
    const scheduledFor = computeScheduledFor(rule, { occurredAt: new Date(ev.occurred_at), eventStartsAt });
    if (!scheduledFor) continue;
    // Event-relative reminders that are already in the past are skipped, not sent late.
    if (relative && scheduledFor.getTime() < now - 60 * 60_000) continue;
    rows.push({
      rule_id: rule.id,
      lead_id: ev.lead_id,
      booking_id: ev.booking_id,
      domain_event_id: ev.id,
      status: "pending" as const,
      scheduled_for: scheduledFor.toISOString(),
      dedupe_key: dedupeKey(rule.key, ev.lead_id, relative && eventStartsAt ? `event@${eventStartsAt.toISOString()}` : ev.id),
    });
  }
  if (rows.length) {
    const { error: insErr } = await db.from("automation_runs").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
    if (insErr) throw new Error(`Failed to schedule automations: ${insErr.message}`);
  }
}

/** Built-in internal notifications (not configurable rules). */
async function runSystemHandler(db: TypedSupabaseClient, ev: DomainEventRow) {
  const leadUrl = ev.lead_id ? absoluteUrl(`/admin/leads/${ev.lead_id}`) : absoluteUrl("/admin");
  const p = (ev.payload ?? {}) as Record<string, unknown>;
  switch (ev.type) {
    case "lead.created":
      await notifyAdmin(db, `New lead ${p.reference ?? ""}: ${p.eventType ?? "Event"} on ${p.eventDate ?? ""}`, `Availability check: ${p.availability ?? "unchecked"}.`, ev.lead_id, leadUrl);
      break;
    case "quote.accepted":
    case "quote.declined":
    case "quote.question":
    case "contract.signed":
    case "payment.deposit_received":
    case "payment.balance_received":
    case "payment.failed":
    case "message.received":
      await notifyAdmin(db, `${EVENT_LABELS[ev.type]}${p.reference ? ` — ${p.reference}` : ""}`, typeof p.detail === "string" ? p.detail : "Open the dashboard for details.", ev.lead_id, leadUrl);
      break;
    default:
      break;
  }
}

export async function runDueAutomations(db: TypedSupabaseClient, now = new Date(), limit = 25): Promise<{ ran: number }> {
  const { data: due, error } = await db
    .from("automation_runs")
    .select("id")
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`Failed to read due automations: ${error.message}`);
  let ran = 0;
  for (const { id } of due ?? []) {
    // Claim atomically so concurrent workers never double-send.
    const { data: claimed } = await db
      .from("automation_runs")
      .update({ status: "running" })
      .eq("id", id)
      .eq("status", "pending")
      .select("*, automation_rules(*)")
      .maybeSingle();
    if (!claimed) continue;
    await executeRun(db, claimed, now);
    ran++;
  }
  return { ran };
}

/**
 * Mark confirmed bookings whose event has ended as completed and emit
 * `event.completed` (drives thank-you / review automations).
 */
export async function completePastEvents(db: TypedSupabaseClient, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - 3 * 3_600_000).toISOString();
  const { data, error } = await db
    .from("bookings")
    .select("id, lead_id, leads!inner(events!inner(ends_at))")
    .eq("status", "confirmed")
    .lt("leads.events.ends_at", cutoff)
    .limit(50);
  if (error) throw new Error(`Failed to find completed events: ${error.message}`);
  for (const b of data ?? []) {
    await db.from("bookings").update({ status: "completed", completed_at: now.toISOString() }).eq("id", b.id).eq("status", "confirmed");
    await db.from("leads").update({ status: "completed" }).eq("id", b.lead_id).in("status", ["confirmed", "deposit_paid"]);
    await emitDomainEvent(db, { type: "event.completed", leadId: b.lead_id, bookingId: b.id });
  }
  return data?.length ?? 0;
}

/** Full cycle used by cron and post-request hooks. */
export async function runAutomationCycle(db: TypedSupabaseClient, now = new Date()) {
  const completed = await completePastEvents(db, now);
  const dispatched = await dispatchPendingDomainEvents(db);
  const { ran } = await runDueAutomations(db, now);
  return { completed, dispatched, ran };
}

/** Never throws — safe to call from `after()` hooks. */
export async function dispatchDomainEventsSafely(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const db = createServiceClient();
    await dispatchPendingDomainEvents(db);
    await runDueAutomations(db);
  } catch (err) {
    console.error("[automation] background dispatch failed", err);
  }
}

/** When an event's date/time changes, drop stale event-relative runs and re-arm them. */
export async function rescheduleUpcomingRuns(db: TypedSupabaseClient, leadId: string, bookingId: string | null) {
  const { data: rules } = await db.from("automation_rules").select("id").eq("trigger_event", "event.upcoming");
  const ruleIds = (rules ?? []).map((r) => r.id);
  if (ruleIds.length) {
    await db.from("automation_runs").update({ status: "cancelled", error: "Event rescheduled" }).eq("lead_id", leadId).eq("status", "pending").in("rule_id", ruleIds);
  }
  if (bookingId) {
    const { data: b } = await db.from("bookings").select("status").eq("id", bookingId).single();
    // Emitting event.upcoming re-arms the event-relative rules at the new start time
    // (dedupe keys include the start time, so the new runs don't collide with the cancelled ones).
    if (b?.status === "confirmed") await emitDomainEvent(db, { type: "event.upcoming", leadId, bookingId, payload: { reason: "rescheduled" } });
  }
}
