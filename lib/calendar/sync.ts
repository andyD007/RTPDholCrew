import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { loadLeadContext, customerName, serviceLabel, type LeadContext } from "@/lib/leads/context";
import { formatVenue } from "@/lib/contracts/render";
import { absoluteUrl } from "@/lib/utils";
import type { CalendarEventInput } from "./ics";
import { getCalendarProvider } from "./provider";

export function bookingCalendarEvent(ctx: LeadContext, audience: "internal" | "customer"): CalendarEventInput {
  const title = audience === "internal" ? `🥁 ${ctx.event.title}` : `RTP Dhol Crew — ${ctx.event.eventType?.name ?? "Performance"}`;
  const description =
    audience === "internal"
      ? [`Customer: ${customerName(ctx)} ${ctx.customer.phone ?? ""}`, `Service: ${serviceLabel(ctx)}`, ctx.event.planner_name ? `Planner: ${ctx.event.planner_name} ${ctx.event.planner_phone ?? ""}` : "", `Admin: ${absoluteUrl(`/admin/leads/${ctx.id}`)}`].filter(Boolean).join("\n")
      : `Live dhol by RTP Dhol Crew. Booking ${ctx.booking?.number ?? ctx.reference}.`;
  return {
    uid: `${ctx.id}@rtpdholcrew`,
    title,
    description,
    location: formatVenue(ctx.event.venue),
    startsAt: new Date(ctx.event.starts_at),
    endsAt: new Date(ctx.event.ends_at),
    status: ctx.booking?.status === "cancelled" ? "CANCELLED" : ctx.booking?.status === "confirmed" || ctx.booking?.status === "completed" ? "CONFIRMED" : "TENTATIVE",
    updatedAt: new Date(ctx.updated_at),
  };
}

/** Push a confirmed booking to the configured calendar provider (no-op for ICS). */
export async function syncBookingToCalendar(db: TypedSupabaseClient, leadId: string) {
  const ctx = await loadLeadContext(db, leadId);
  if (!ctx?.booking) return;
  const provider = getCalendarProvider();
  if (ctx.booking.status === "cancelled") {
    if (ctx.booking.external_calendar_id) await provider.deleteEvent(ctx.booking.external_calendar_id);
    return;
  }
  const { externalId } = await provider.upsertEvent(bookingCalendarEvent(ctx, "internal"), ctx.booking.external_calendar_id);
  if (externalId && externalId !== ctx.booking.external_calendar_id) {
    await db.from("bookings").update({ external_calendar_id: externalId }).eq("id", ctx.booking.id);
  }
}
