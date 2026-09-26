/**
 * Pure scheduling rules for the automation engine (unit tested).
 */
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type RuleLike = {
  key: string;
  trigger_event: string;
  delay_minutes: number;
  channel: string;
  conditions: unknown;
};

export type AutomationLimits = {
  maxMessagesPerLeadPerDay: number;
  quietHoursStart: number;
  quietHoursEnd: number;
  maxFollowUpsPerStage: number;
};

/** Rules whose timing is relative to the event start (delay = minutes BEFORE start). */
export const EVENT_RELATIVE_TRIGGERS = new Set(["event.upcoming"]);

/** Transactional messages bypass throttling/quiet hours (customer just acted). */
export const TRANSACTIONAL_RULES = new Set(["lead.auto_reply", "booking.confirmation"]);

export function computeScheduledFor(rule: RuleLike, anchor: { occurredAt: Date; eventStartsAt?: Date | null }): Date | null {
  if (EVENT_RELATIVE_TRIGGERS.has(rule.trigger_event)) {
    if (!anchor.eventStartsAt) return null;
    return new Date(anchor.eventStartsAt.getTime() - rule.delay_minutes * 60_000);
  }
  return new Date(anchor.occurredAt.getTime() + rule.delay_minutes * 60_000);
}

export function dedupeKey(ruleKey: string, leadId: string | null, anchorId: string): string {
  return `${ruleKey}:${leadId ?? "none"}:${anchorId}`;
}

/** Move a send time out of quiet hours (local business time) to the end of the quiet window. */
export function applyQuietHours(at: Date, limits: Pick<AutomationLimits, "quietHoursStart" | "quietHoursEnd">, tz: string): Date {
  const { quietHoursStart: start, quietHoursEnd: end } = limits;
  if (start === end) return at;
  const hour = Number(formatInTimeZone(at, tz, "H"));
  const inQuiet = start > end ? hour >= start || hour < end : hour >= start && hour < end;
  if (!inQuiet) return at;
  let day = formatInTimeZone(at, tz, "yyyy-MM-dd");
  if (start > end && hour >= start) {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    day = d.toISOString().slice(0, 10);
  }
  return fromZonedTime(`${day}T${String(end).padStart(2, "0")}:00:00`, tz);
}

export type ConditionState = {
  leadStatus?: string | null;
  quoteStatus?: string | null;
  contractStatus?: string | null;
  bookingStatus?: string | null;
};

type Conditions = {
  leadStatusIn?: string[];
  quoteStatusIn?: string[];
  contractStatusIn?: string[];
  bookingStatusIn?: string[];
};

/** Conditions are re-checked at run time so stale follow-ups never fire. */
export function checkConditions(raw: unknown, state: ConditionState): { ok: true } | { ok: false; reason: string } {
  const c = (raw ?? {}) as Conditions;
  const checks: [keyof Conditions, string | null | undefined, string][] = [
    ["leadStatusIn", state.leadStatus, "lead status"],
    ["quoteStatusIn", state.quoteStatus, "quote status"],
    ["contractStatusIn", state.contractStatus, "contract status"],
    ["bookingStatusIn", state.bookingStatus, "booking status"],
  ];
  for (const [key, value, label] of checks) {
    const allowed = c[key];
    if (Array.isArray(allowed) && allowed.length && (!value || !allowed.includes(value))) {
      return { ok: false, reason: `${label} is ${value ?? "none"} (needs ${allowed.join("/")})` };
    }
  }
  return { ok: true };
}

/** Terminal lead states never receive automated customer messages. */
export const TERMINAL_LEAD_STATES = new Set(["lost", "cancelled"]);

export function throttleDecision(
  sentToday: number,
  limits: Pick<AutomationLimits, "maxMessagesPerLeadPerDay">,
  ruleKey: string,
): "send" | "defer" {
  if (TRANSACTIONAL_RULES.has(ruleKey)) return "send";
  return sentToday >= limits.maxMessagesPerLeadPerDay ? "defer" : "send";
}

export const MAX_RUN_ATTEMPTS = 3;
export function retryDelayMinutes(attempt: number): number {
  return [5, 30, 120][Math.min(attempt, 2)];
}
