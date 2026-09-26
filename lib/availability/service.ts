import "server-only";
import type { Json } from "@/types/database";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { getSetting } from "@/lib/database/settings";
import { addDaysLocal } from "@/lib/time";
import { evaluateAvailability, type AvailabilityResult, type Commitment } from "./engine";

/** Lead statuses that hold a date softly (quote/contract out, no deposit yet). */
export const HOLD_STATUSES = ["qualified", "quote_sent", "awaiting_customer", "contract_sent", "contract_signed", "deposit_pending"] as const;
/** Lead statuses that are firm bookings. */
export const BOOKED_STATUSES = ["deposit_paid", "confirmed"] as const;

type EventWindow = { startsAt: Date; endsAt: Date; travelBufferMinutes: number; localDate: string; city?: string | null };

/**
 * Load commitments around a date (±1 day covers events crossing midnight and
 * travel buffers) and evaluate the candidate window.
 */
export async function checkAvailability(
  db: TypedSupabaseClient,
  candidate: EventWindow,
  opts: { excludeLeadId?: string } = {},
): Promise<AvailabilityResult> {
  const rules = await getSetting("availability.rules", db);
  const from = addDaysLocal(candidate.localDate, -1);
  const to = addDaysLocal(candidate.localDate, 1);

  const [{ data: rows, error }, { data: blocks, error: blockErr }] = await Promise.all([
    db
      .from("leads")
      .select("id, status, events!inner(id, title, event_date, starts_at, ends_at, travel_buffer_minutes, venues(city)), bookings(status)")
      .gte("events.event_date", from)
      .lte("events.event_date", to)
      .in("status", [...HOLD_STATUSES, ...BOOKED_STATUSES]),
    db
      .from("availability_blocks")
      .select("id, starts_at, ends_at, reason")
      .lt("starts_at", new Date(candidate.endsAt.getTime() + 24 * 3600_000).toISOString())
      .gt("ends_at", new Date(candidate.startsAt.getTime() - 24 * 3600_000).toISOString()),
  ]);
  if (error) throw new Error(`Availability lookup failed: ${error.message}`);
  if (blockErr) throw new Error(`Availability lookup failed: ${blockErr.message}`);

  const commitments: Commitment[] = [];
  for (const r of rows ?? []) {
    if (r.id === opts.excludeLeadId) continue;
    const ev = r.events;
    const bookingConfirmed = r.bookings?.status === "confirmed";
    const firm = bookingConfirmed || (BOOKED_STATUSES as readonly string[]).includes(r.status);
    commitments.push({
      id: r.id,
      kind: firm ? "booking" : "hold",
      label: ev.title,
      startsAt: new Date(ev.starts_at),
      endsAt: new Date(ev.ends_at),
      travelBufferMinutes: ev.travel_buffer_minutes,
      city: ev.venues?.city ?? null,
      localDate: ev.event_date,
    });
  }
  for (const b of blocks ?? []) {
    commitments.push({
      id: b.id,
      kind: "block",
      label: b.reason || "Blocked",
      startsAt: new Date(b.starts_at),
      endsAt: new Date(b.ends_at),
      travelBufferMinutes: 0,
    });
  }

  return evaluateAvailability(
    { ...candidate, travelBufferMinutes: Math.max(candidate.travelBufferMinutes, 0) },
    commitments,
    { manualReviewGapMinutes: rules.manualReviewGapMinutes, maxEventsPerDay: rules.maxEventsPerDay },
  );
}

/** Re-check a lead's availability and persist the result (respects admin override). */
export async function refreshLeadAvailability(db: TypedSupabaseClient, leadId: string): Promise<AvailabilityResult | null> {
  const { data: lead, error } = await db
    .from("leads")
    .select("id, availability_override, events!inner(event_date, starts_at, ends_at, travel_buffer_minutes, venues(city))")
    .eq("id", leadId)
    .single();
  if (error || !lead) throw new Error(`Lead not found: ${error?.message ?? leadId}`);
  const ev = lead.events;
  const result = await checkAvailability(
    db,
    {
      startsAt: new Date(ev.starts_at),
      endsAt: new Date(ev.ends_at),
      travelBufferMinutes: ev.travel_buffer_minutes,
      localDate: ev.event_date,
      city: ev.venues?.city,
    },
    { excludeLeadId: leadId },
  );
  const update: {
    availability_checked_at: string;
    availability_details: Json;
    availability_status?: AvailabilityResult["status"];
  } = {
    availability_checked_at: new Date().toISOString(),
    availability_details: { summary: result.summary, conflicts: result.conflicts, computedStatus: result.status } as unknown as Json,
  };
  if (!lead.availability_override) update.availability_status = result.status;
  const { error: upErr } = await db.from("leads").update(update).eq("id", leadId);
  if (upErr) throw new Error(`Failed to store availability: ${upErr.message}`);
  return result;
}
