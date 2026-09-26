/**
 * Deterministic pricing suggestion used by the Quote Assistant. It explains
 * every factor it applies; the admin always chooses the final price.
 *
 * Inputs are the service's pricing hints (base price for included minutes +
 * extra-hour rate) and admin-configured pricing rules from Settings.
 */
import type { QuoteSuggestion } from "@/lib/agents/types";

export type PricingRules = {
  travelFreeRadiusMiles: number;
  travelPerMileCents: number;
  weekendPremiumPercent: number;
  peakSeasonMonths: number[];
  peakSeasonPremiumPercent: number;
  lastMinuteDays: number;
  lastMinutePremiumPercent: number;
  additionalPerformerPercent: number;
};

export type PricingInput = {
  serviceName: string;
  basePriceCents: number | null;
  includedMinutes: number | null;
  extraHourCents: number | null;
  servicePerformers: number;
  requestedPerformers: number;
  durationMinutes: number;
  eventDate: string; // YYYY-MM-DD
  today: string; // YYYY-MM-DD
  travelMiles: number | null;
  rules: PricingRules;
};

/** Approximate one-way driving miles from Raleigh. Estimates — admins can override on the quote. */
export const MILES_FROM_RALEIGH: Record<string, number> = {
  raleigh: 0, cary: 12, garner: 10, knightdale: 10, morrisville: 15, "wake forest": 18, apex: 18, "research triangle park": 18,
  rtp: 18, wendell: 18, "holly springs": 22, "fuquay-varina": 22, durham: 25, "chapel hill": 30, carrboro: 31, clayton: 17,
  pittsboro: 38, hillsborough: 40, smithfield: 30, burlington: 60, fayetteville: 65, greensboro: 80, rocky_mount: 60,
  wilmington: 130, charlotte: 165,
};

export function estimateMiles(city: string | null | undefined): number | null {
  if (!city) return null;
  const key = city.trim().toLowerCase();
  return key in MILES_FROM_RALEIGH ? MILES_FROM_RALEIGH[key] : null;
}

const round25 = (cents: number) => Math.round(cents / 2500) * 2500; // round to $25

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

export function suggestPrice(input: PricingInput): QuoteSuggestion {
  const factors: QuoteSuggestion["factors"] = [];
  const lineItems: QuoteSuggestion["lineItems"] = [];
  let confidence: QuoteSuggestion["confidence"] = "high";
  const reasons: string[] = [];

  if (input.basePriceCents === null || input.includedMinutes === null) {
    confidence = "low";
    reasons.push("No pricing hints are configured for this service");
  }
  const base = input.basePriceCents ?? 0;
  const included = input.includedMinutes ?? input.durationMinutes;
  const extraHour = input.extraHourCents ?? 0;

  lineItems.push({ description: `${input.serviceName} (up to ${included} min)`, quantity: 1, unitPriceCents: base });
  factors.push({ label: "Base service", impact: `+$${(base / 100).toFixed(0)}`, detail: `${input.serviceName}, includes ${included} minutes` });

  const extraMinutes = Math.max(0, input.durationMinutes - included);
  if (extraMinutes > 0) {
    const hours = Math.ceil(extraMinutes / 30) / 2; // bill in half-hours
    lineItems.push({ description: `Additional time (${hours} hr)`, quantity: hours, unitPriceCents: extraHour });
    factors.push({ label: "Extended duration", impact: `+$${((hours * extraHour) / 100).toFixed(0)}`, detail: `${extraMinutes} min beyond included time, billed per half hour` });
  }

  const extraPerformers = Math.max(0, input.requestedPerformers - Math.max(input.servicePerformers, 1));
  if (extraPerformers > 0) {
    const perPlayer = round25((base * input.rules.additionalPerformerPercent) / 100);
    lineItems.push({ description: "Additional dhol player", quantity: extraPerformers, unitPriceCents: perPlayer });
    factors.push({ label: "Additional performer", impact: `+$${((perPlayer * extraPerformers) / 100).toFixed(0)}`, detail: `${input.rules.additionalPerformerPercent}% of base per extra player` });
  }

  const subtotalBeforePremiums = lineItems.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0);
  let premiumPercent = 0;
  const date = new Date(`${input.eventDate}T12:00:00Z`);
  const dow = date.getUTCDay();
  if ((dow === 5 || dow === 6) && input.rules.weekendPremiumPercent > 0) {
    premiumPercent += input.rules.weekendPremiumPercent;
    factors.push({ label: "Weekend", impact: `+${input.rules.weekendPremiumPercent}%`, detail: dow === 6 ? "Saturday" : "Friday" });
  }
  if (input.rules.peakSeasonMonths.includes(date.getUTCMonth() + 1) && input.rules.peakSeasonPremiumPercent > 0) {
    premiumPercent += input.rules.peakSeasonPremiumPercent;
    factors.push({ label: "Peak season", impact: `+${input.rules.peakSeasonPremiumPercent}%`, detail: "High-demand wedding month" });
  }
  const leadDays = daysBetween(input.today, input.eventDate);
  if (leadDays >= 0 && leadDays <= input.rules.lastMinuteDays && input.rules.lastMinutePremiumPercent > 0) {
    premiumPercent += input.rules.lastMinutePremiumPercent;
    factors.push({ label: "Short notice", impact: `+${input.rules.lastMinutePremiumPercent}%`, detail: `Event is ${leadDays} days away` });
  }
  if (premiumPercent > 0) {
    const premium = round25((subtotalBeforePremiums * premiumPercent) / 100);
    lineItems.push({ description: "Date premium", quantity: 1, unitPriceCents: premium });
  }

  let travelFeeCents = 0;
  if (input.travelMiles === null) {
    if (confidence === "high") confidence = "medium";
    reasons.push("Travel distance unknown — confirm the venue location");
  } else {
    const billable = Math.max(0, input.travelMiles - input.rules.travelFreeRadiusMiles);
    // Round trip for miles beyond the free radius.
    travelFeeCents = Math.round((billable * 2 * input.rules.travelPerMileCents) / 500) * 500; // nearest $5
    factors.push({
      label: "Travel",
      impact: travelFeeCents ? `+$${(travelFeeCents / 100).toFixed(0)}` : "included",
      detail: `~${input.travelMiles} mi from Raleigh; ${input.rules.travelFreeRadiusMiles} mi included`,
    });
  }

  const suggestedTotalCents = lineItems.reduce((s, l) => s + Math.round(l.quantity * l.unitPriceCents), 0) + travelFeeCents;
  return {
    suggestedTotalCents,
    lineItems,
    travelFeeCents,
    factors,
    confidence,
    confidenceReason: reasons.length ? reasons.join(". ") : "All pricing inputs are known",
    notes: "Suggested from configured pricing hints. Review and adjust before sending — the final price is always your call.",
  };
}
