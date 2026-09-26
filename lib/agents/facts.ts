import type { LeadContext } from "@/lib/leads/context";
import { formatMoney } from "@/lib/money";
import { formatDuration, formatEventDate, formatTimeRange } from "@/lib/time";
import { formatVenue } from "@/lib/contracts/render";

/**
 * The facts about a lead that agents are allowed to see. Deliberately excludes
 * internal IDs, tokens, payment identifiers and anything not needed.
 */
export function leadFacts(ctx: LeadContext, today: string) {
  const days = Math.round((Date.parse(`${ctx.event.event_date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  return {
    reference: ctx.reference,
    status: ctx.status,
    customer: { firstName: ctx.customer.first_name, lastName: ctx.customer.last_name },
    eventType: ctx.event.eventType?.name ?? "Event",
    eventTitle: ctx.event.title,
    date: formatEventDate(ctx.event.event_date),
    dayOfWeek: new Date(`${ctx.event.event_date}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
    daysUntilEvent: days,
    timeWindow: formatTimeRange(ctx.event.start_time, ctx.event.end_time),
    duration: formatDuration(ctx.event.duration_minutes),
    venue: formatVenue(ctx.event.venue),
    venueName: ctx.event.venue?.name ?? null,
    city: ctx.event.venue?.city ?? null,
    streetKnown: Boolean(ctx.event.venue?.street),
    setting: ctx.event.venue?.setting ?? "unknown",
    parkingNotes: ctx.event.venue?.parking_notes ?? null,
    guestCount: ctx.event.guest_count,
    service: ctx.package?.name ?? ctx.service?.name ?? ctx.requested_service_label ?? "Custom",
    performers: ctx.service?.performers ?? 1,
    planner: ctx.event.planner_name ? { name: ctx.event.planner_name, email: ctx.event.planner_email, phone: ctx.event.planner_phone } : null,
    customerMessage: ctx.message,
    specialInstructions: ctx.event.special_instructions,
    entranceInstructions: ctx.event.entrance_instructions,
    specialSongs: ctx.event.special_songs,
    availability: {
      status: ctx.availability_status,
      summary: (ctx.availability_details as { summary?: string } | null)?.summary ?? null,
    },
    quote: ctx.latestQuote
      ? {
          number: ctx.latestQuote.number,
          status: ctx.latestQuote.status,
          total: formatMoney(ctx.latestQuote.total_cents, { showCents: true }),
          deposit: formatMoney(ctx.latestQuote.deposit_cents, { showCents: true }),
          expiresOn: ctx.latestQuote.expires_on,
        }
      : null,
    contractStatus: ctx.liveContract?.status ?? null,
    payment: {
      total: formatMoney(ctx.money.totalCents, { showCents: true }),
      paid: formatMoney(ctx.money.paidCents, { showCents: true }),
      balance: formatMoney(ctx.money.balanceCents, { showCents: true }),
      depositPaid: ctx.money.depositPaid,
    },
  };
}

export type LeadFacts = ReturnType<typeof leadFacts>;
