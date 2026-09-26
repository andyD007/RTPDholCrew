import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { getSetting } from "@/lib/database/settings";
import { loadLeadContext } from "@/lib/leads/context";
import { createAccessToken, customerLinks } from "@/lib/portal/access";
import { buildTemplateVars, renderMessage } from "@/lib/notifications/template-vars";
import { sendMessage } from "@/lib/notifications/send";
import { analyzeLead, buildEventBrief, draftCustomerResponse, draftReviewRequest } from "@/lib/agents";
import type { ResponsePurpose } from "@/lib/agents/types";
import { BUSINESS_TZ } from "@/lib/time";
import type { Json, Tables } from "@/types/database";
import { emitDomainEvent } from "./events";
import {
  applyQuietHours,
  checkConditions,
  MAX_RUN_ATTEMPTS,
  retryDelayMinutes,
  TERMINAL_LEAD_STATES,
  throttleDecision,
  TRANSACTIONAL_RULES,
} from "./scheduling";

type RunRow = Tables<"automation_runs"> & { automation_rules: Tables<"automation_rules"> | null };

/** Template key → customer-response purpose, for AI-personalised drafts. */
const PURPOSE_FOR_TEMPLATE: Record<string, ResponsePurpose> = {
  "quote.follow_up": "quote_follow_up",
  "contract.reminder": "contract_reminder",
  "deposit.reminder": "deposit_reminder",
  "event.week_before": "event_confirmation",
  "event.thank_you": "post_event_thank_you",
  "lead.received": "availability_response",
  "quote.sent": "quote_introduction",
};

export async function executeRun(db: TypedSupabaseClient, run: RunRow, now: Date): Promise<void> {
  const rule = run.automation_rules;
  const finish = async (status: "succeeded" | "skipped" | "failed", result: Record<string, unknown>, error?: string) => {
    await db
      .from("automation_runs")
      .update({ status, result: result as Json, error: error ?? null, executed_at: new Date().toISOString(), attempts: run.attempts + 1 })
      .eq("id", run.id);
  };
  const defer = async (until: Date, reason: string) => {
    await db.from("automation_runs").update({ status: "pending", scheduled_for: until.toISOString(), result: { deferred: reason } as Json }).eq("id", run.id);
  };

  if (!rule || !rule.is_enabled) return finish("skipped", {}, "Rule disabled or deleted");

  try {
    const ctx = run.lead_id ? await loadLeadContext(db, run.lead_id) : null;
    if (run.lead_id && !ctx) return finish("skipped", {}, "Lead no longer exists");

    // Re-check conditions against the CURRENT state — stale follow-ups never fire.
    if (ctx) {
      if (TERMINAL_LEAD_STATES.has(ctx.status) && rule.channel !== "internal") return finish("skipped", { reason: `Lead is ${ctx.status}` });
      const cond = checkConditions(rule.conditions, {
        leadStatus: ctx.status,
        quoteStatus: ctx.latestQuote?.status,
        contractStatus: ctx.liveContract?.status,
        bookingStatus: ctx.booking?.status,
      });
      if (!cond.ok) return finish("skipped", { reason: cond.reason });
    }

    const limits = await getSetting("automation.limits", db);
    const messaging = rule.channel === "email" || rule.channel === "sms" || rule.channel === "ai_draft";

    // Anti-spam: follow-up cap per rule per lead.
    if (ctx && messaging && !TRANSACTIONAL_RULES.has(rule.key)) {
      const { count } = await db
        .from("automation_runs")
        .select("id", { count: "exact", head: true })
        .eq("rule_id", rule.id)
        .eq("lead_id", ctx.id)
        .eq("status", "succeeded");
      if ((count ?? 0) >= limits.maxFollowUpsPerStage) return finish("skipped", { reason: "Follow-up limit reached for this stage" });
    }

    // Anti-spam: daily message cap and quiet hours for messages that actually send.
    const willSend = rule.channel === "email" || rule.channel === "sms";
    if (ctx && willSend) {
      const dayStart = new Date(now.getTime() - 24 * 3_600_000).toISOString();
      const { count } = await db
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", ctx.id)
        .eq("direction", "outbound")
        .in("status", ["sent", "logged", "delivered"])
        .gte("sent_at", dayStart);
      if (throttleDecision(count ?? 0, limits, rule.key) === "defer") return defer(new Date(now.getTime() + 24 * 3_600_000), "daily message limit");
      if (!TRANSACTIONAL_RULES.has(rule.key)) {
        const allowedAt = applyQuietHours(now, limits, BUSINESS_TZ);
        if (allowedAt.getTime() > now.getTime()) return defer(allowedAt, "quiet hours");
      }
    }

    // ── Execute ──
    if (rule.channel === "internal") {
      if (rule.agent === "lead_intake" && ctx) {
        const ai = await getSetting("ai.settings", db);
        if (!ai.autoAnalyzeLeads) return finish("skipped", { reason: "Automatic lead analysis is turned off" });
        const res = await analyzeLead(db, ctx.id);
        return finish("succeeded", { generationId: res.generationId, provider: res.provider });
      }
      if (rule.agent === "event_prep" && ctx) {
        const res = await buildEventBrief(db, ctx.id);
        return finish("succeeded", { generationId: res.generationId, provider: res.provider });
      }
      return finish("skipped", { reason: `Unknown internal agent ${rule.agent}` });
    }

    if (!ctx) return finish("skipped", { reason: "Messaging rules need a lead" });

    if (rule.channel === "ai_draft") {
      if (rule.agent === "review") {
        const res = await draftReviewRequest(db, ctx.id);
        return finish("succeeded", { draftMessageId: res.messageId, generationId: res.generationId });
      }
      const purpose = PURPOSE_FOR_TEMPLATE[rule.template_key ?? ""] ?? "quote_follow_up";
      const res = await draftCustomerResponse(db, ctx.id, purpose, "email");
      await db.from("messages").update({ automation_run_id: run.id }).eq("id", res.messageId);
      return finish("succeeded", { draftMessageId: res.messageId, generationId: res.generationId });
    }

    // Template email/SMS.
    const { data: template } = await db.from("message_templates").select("*").eq("key", rule.template_key ?? "").eq("is_active", true).maybeSingle();
    if (!template) return finish("skipped", { reason: `Template ${rule.template_key} missing or inactive` });
    if (template.channel !== rule.channel) return finish("failed", {}, `Template channel ${template.channel} does not match rule channel ${rule.channel}`);

    const to = rule.channel === "email" ? ctx.customer.email : ctx.customer.phone;
    if (!to) return finish("skipped", { reason: `Customer has no ${rule.channel === "email" ? "email" : "phone number"}` });

    const [profile, social] = await Promise.all([getSetting("business.profile", db), getSetting("business.social", db)]);
    const token = await createAccessToken(db, ctx.id);
    const links = customerLinks(token);
    const vars = buildTemplateVars(ctx, links, profile, social.googleReview || social.facebookReview);
    const rendered = renderMessage(template, vars);

    // Only templates explicitly approved for auto-send AND rules set to auto-send go out automatically.
    if (rule.auto_send && template.auto_send_allowed) {
      const res = await sendMessage(db, {
        leadId: ctx.id,
        bookingId: ctx.booking?.id,
        customerId: ctx.customer_id,
        channel: rule.channel as "email" | "sms",
        to,
        subject: rendered.subject,
        body: rendered.body,
        templateKey: template.key,
        automationRunId: run.id,
      });
      if (res.status === "failed") throw new Error(res.error ?? "Send failed");
      if (["event.week_before", "event.day_before", "contract.reminder", "deposit.reminder"].includes(template.key)) {
        await emitDomainEvent(db, { type: "reminder.sent", leadId: ctx.id, bookingId: ctx.booking?.id, payload: { template: template.key, channel: rule.channel } });
      }
      return finish("succeeded", { messageId: res.messageId, delivery: res.status });
    }

    const { data: draft, error } = await db
      .from("messages")
      .insert({
        lead_id: ctx.id,
        booking_id: ctx.booking?.id ?? null,
        customer_id: ctx.customer_id,
        type: rule.channel as "email" | "sms",
        direction: "outbound",
        status: "draft",
        recipient: to,
        subject: rendered.subject,
        body: rendered.body,
        template_key: template.key,
        automation_run_id: run.id,
        metadata: { awaitingApproval: true, rule: rule.key },
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return finish("succeeded", { draftMessageId: draft.id, awaitingApproval: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[automation] run ${run.id} (${rule.key}) failed:`, message);
    if (run.attempts + 1 < MAX_RUN_ATTEMPTS) {
      await db
        .from("automation_runs")
        .update({ status: "pending", attempts: run.attempts + 1, error: message, scheduled_for: new Date(now.getTime() + retryDelayMinutes(run.attempts) * 60_000).toISOString() })
        .eq("id", run.id);
      return;
    }
    await finish("failed", {}, message);
  }
}
