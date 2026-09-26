/**
 * Availability conflict detection (pure — no I/O, fully unit tested).
 *
 * Each existing commitment is a time window plus the travel buffer needed
 * before/after it. For a candidate event we compute the gap in minutes between
 * windows (negative = overlap) and classify:
 *
 *   hard commitment (confirmed booking or admin blackout)
 *     overlap                         → UNAVAILABLE
 *     gap < required travel buffer    → MANUAL_REVIEW  (possible, but tight)
 *     gap < buffer + review margin    → MANUAL_REVIEW  (flag for a human look)
 *   soft hold (lead with a quote/contract out, not yet confirmed)
 *     overlap or gap < buffer         → MANUAL_REVIEW
 *   daily limit reached (confirmed)   → MANUAL_REVIEW
 *
 * The engine never declines a customer: UNAVAILABLE is advice for the admin,
 * who can override it (e.g. by adding a second player).
 */

export type AvailabilityStatus = "available" | "manual_review" | "unavailable";

export type Commitment = {
  id: string;
  kind: "booking" | "hold" | "block";
  label: string;
  startsAt: Date;
  endsAt: Date;
  travelBufferMinutes: number;
  city?: string | null;
  localDate?: string; // YYYY-MM-DD in business TZ
};

export type Candidate = {
  startsAt: Date;
  endsAt: Date;
  travelBufferMinutes: number;
  city?: string | null;
  localDate?: string;
};

export type AvailabilityRules = {
  manualReviewGapMinutes: number;
  maxEventsPerDay: number;
};

export const DEFAULT_AVAILABILITY_RULES: AvailabilityRules = { manualReviewGapMinutes: 30, maxEventsPerDay: 3 };

export type ConflictReason = "overlap" | "travel_buffer" | "tight_turnaround" | "soft_hold" | "blackout" | "daily_limit";

export type Conflict = {
  commitmentId: string;
  kind: Commitment["kind"];
  label: string;
  reason: ConflictReason;
  severity: Exclude<AvailabilityStatus, "available">;
  gapMinutes: number;
  city?: string | null;
};

export type AvailabilityResult = {
  status: AvailabilityStatus;
  conflicts: Conflict[];
  summary: string;
};

const MINUTE = 60_000;

/** Minutes between two windows; negative when they overlap. */
export function gapBetween(a: { startsAt: Date; endsAt: Date }, b: { startsAt: Date; endsAt: Date }): number {
  if (a.endsAt <= b.startsAt) return Math.round((b.startsAt.getTime() - a.endsAt.getTime()) / MINUTE);
  if (b.endsAt <= a.startsAt) return Math.round((a.startsAt.getTime() - b.endsAt.getTime()) / MINUTE);
  const overlap = Math.min(a.endsAt.getTime(), b.endsAt.getTime()) - Math.max(a.startsAt.getTime(), b.startsAt.getTime());
  return -Math.round(overlap / MINUTE);
}

export function evaluateAvailability(
  candidate: Candidate,
  commitments: Commitment[],
  rules: AvailabilityRules = DEFAULT_AVAILABILITY_RULES,
): AvailabilityResult {
  if (!(candidate.endsAt > candidate.startsAt)) throw new Error("Candidate end must be after start");
  const conflicts: Conflict[] = [];

  for (const c of commitments) {
    const gap = gapBetween(candidate, c);
    const buffer = Math.max(candidate.travelBufferMinutes, c.travelBufferMinutes);
    const base = { commitmentId: c.id, kind: c.kind, label: c.label, gapMinutes: gap, city: c.city };

    if (c.kind === "block") {
      if (gap < 0) conflicts.push({ ...base, reason: "blackout", severity: "unavailable" });
      continue;
    }
    if (c.kind === "hold") {
      if (gap < buffer) conflicts.push({ ...base, reason: "soft_hold", severity: "manual_review" });
      continue;
    }
    // Confirmed booking.
    if (gap < 0) conflicts.push({ ...base, reason: "overlap", severity: "unavailable" });
    else if (gap < buffer) conflicts.push({ ...base, reason: "travel_buffer", severity: "manual_review" });
    else if (gap < buffer + rules.manualReviewGapMinutes) conflicts.push({ ...base, reason: "tight_turnaround", severity: "manual_review" });
  }

  if (candidate.localDate) {
    const sameDay = commitments.filter((c) => c.kind === "booking" && c.localDate === candidate.localDate);
    if (sameDay.length >= rules.maxEventsPerDay) {
      conflicts.push({
        commitmentId: "daily-limit",
        kind: "booking",
        label: `${sameDay.length} confirmed events already on this date`,
        reason: "daily_limit",
        severity: "manual_review",
        gapMinutes: 0,
      });
    }
  }

  const status: AvailabilityStatus = conflicts.some((c) => c.severity === "unavailable")
    ? "unavailable"
    : conflicts.length
      ? "manual_review"
      : "available";

  return { status, conflicts, summary: summarize(status, conflicts) };
}

const REASON_TEXT: Record<ConflictReason, string> = {
  overlap: "overlaps a confirmed booking",
  travel_buffer: "is inside the travel buffer of a confirmed booking",
  tight_turnaround: "leaves a tight turnaround after/before a confirmed booking",
  soft_hold: "is close to a pending quote/contract",
  blackout: "falls in a blocked-off period",
  daily_limit: "would exceed the daily event limit",
};

function summarize(status: AvailabilityStatus, conflicts: Conflict[]): string {
  if (status === "available") return "No conflicts with confirmed bookings or holds.";
  return conflicts
    .map((c) => {
      const when = c.reason === "daily_limit" ? "" : c.gapMinutes < 0 ? ` (${-c.gapMinutes} min overlap)` : ` (${c.gapMinutes} min apart)`;
      return `${REASON_TEXT[c.reason]}: ${c.label}${when}`;
    })
    .join("; ");
}
