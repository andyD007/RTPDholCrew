import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { emitDomainEvent } from "@/lib/automation/events";
import { rescheduleUpcomingRuns } from "@/lib/automation/dispatcher";
import { refreshLeadAvailability } from "@/lib/availability/service";
import { audit } from "@/lib/security/audit";
import { eventWindow } from "@/lib/time";
import type { LeadStatus } from "./status";

/**
 * Admin-driven status change with its side effects:
 *   lost/cancelled → cancel pending automations (and the booking, if any)
 *   completed      → complete the booking, emit event.completed
 */
export async function changeLeadStatus(db: TypedSupabaseClient, leadId: string, to: LeadStatus, actor: { id: string }, reason?: string) {
  const { data: lead, error } = await db.from("leads").select("id, status, reference, bookings(id, status)").eq("id", leadId).single();
  if (error || !lead) throw new Error("Lead not found");
  const from = lead.status;
  if (from === to) return { from, to };

  const update: { status: LeadStatus; lost_reason?: string | null } = { status: to };
  if (to === "lost" || to === "cancelled") update.lost_reason = reason?.slice(0, 500) ?? null;
  const { error: upErr } = await db.from("leads").update(update).eq("id", leadId);
  if (upErr) throw new Error(`Failed to update status: ${upErr.message}`);

  const booking = lead.bookings;
  if (to === "lost" || to === "cancelled") {
    await db.from("automation_runs").update({ status: "cancelled", error: `Lead ${to}` }).eq("lead_id", leadId).eq("status", "pending");
    if (booking && booking.status !== "cancelled" && booking.status !== "completed") {
      await db.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: reason ?? null }).eq("id", booking.id);
      await emitDomainEvent({ type: "booking.cancelled", leadId, bookingId: booking.id, actor: `admin:${actor.id}`, payload: { reason: reason ?? null } });
    }
  }
  if (to === "completed" && booking && booking.status === "confirmed") {
    await db.from("bookings").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", booking.id);
    await emitDomainEvent({ type: "event.completed", leadId, bookingId: booking.id, actor: `admin:${actor.id}` });
  }
  await emitDomainEvent({ type: "lead.status_changed", leadId, actor: `admin:${actor.id}`, payload: { from, to, reason: reason ?? null } });
  await audit({ actorId: actor.id, action: "lead.status_changed", entityType: "lead", entityId: leadId, before: { status: from }, after: { status: to, reason } });
  return { from, to };
}

export async function overrideAvailability(
  db: TypedSupabaseClient,
  leadId: string,
  status: "available" | "manual_review" | "unavailable" | null,
  actor: { id: string },
  note?: string,
) {
  const { data: before } = await db.from("leads").select("availability_status, availability_override").eq("id", leadId).single();
  if (status === null) {
    await db.from("leads").update({ availability_override: false, availability_override_by: null }).eq("id", leadId);
    await refreshLeadAvailability(db, leadId);
  } else {
    const { error } = await db.from("leads").update({ availability_status: status, availability_override: true, availability_override_by: actor.id }).eq("id", leadId);
    if (error) throw new Error(error.message);
  }
  await emitDomainEvent({ type: "lead.availability_overridden", leadId, actor: `admin:${actor.id}`, payload: { status: status ?? "recomputed", note: note ?? null } });
  await audit({ actorId: actor.id, action: "lead.availability_override", entityType: "lead", entityId: leadId, before, after: { status, note } });
}

export type EventDetailsInput = {
  title: string;
  eventDate: string;
  startTime: string;
  durationMinutes: number;
  travelBufferMinutes: number;
  guestCount: number | null;
  plannerName: string | null;
  plannerEmail: string | null;
  plannerPhone: string | null;
  specialInstructions: string | null;
  entranceInstructions: string | null;
  specialSongs: string | null;
  venue: { name: string; street: string | null; city: string; state: string; postalCode: string | null; setting: "indoor" | "outdoor" | "mixed" | "unknown"; parkingNotes: string | null };
};

export async function updateEventDetails(db: TypedSupabaseClient, leadId: string, input: EventDetailsInput, actor: { id: string }) {
  const { data: lead, error } = await db.from("leads").select("id, event_id, bookings(id), events!inner(event_date, start_time, duration_minutes, venue_id)").eq("id", leadId).single();
  if (error || !lead) throw new Error("Lead not found");
  const w = eventWindow(input.eventDate, input.startTime, input.durationMinutes);
  const timeChanged = lead.events.event_date !== input.eventDate || lead.events.start_time.slice(0, 5) !== input.startTime || lead.events.duration_minutes !== input.durationMinutes;

  let venueId = lead.events.venue_id;
  const venueRow = {
    name: input.venue.name,
    street: input.venue.street,
    city: input.venue.city,
    state: input.venue.state,
    postal_code: input.venue.postalCode,
    setting: input.venue.setting,
    parking_notes: input.venue.parkingNotes,
  };
  if (venueId) {
    const { error: vErr } = await db.from("venues").update(venueRow).eq("id", venueId);
    if (vErr) throw new Error(vErr.message);
  } else {
    const { data: v, error: vErr } = await db.from("venues").insert(venueRow).select("id").single();
    if (vErr) throw new Error(vErr.message);
    venueId = v.id;
  }
  const { error: eErr } = await db
    .from("events")
    .update({
      title: input.title,
      event_date: input.eventDate,
      start_time: input.startTime,
      end_time: w.endTime,
      duration_minutes: input.durationMinutes,
      starts_at: w.startsAt.toISOString(),
      ends_at: w.endsAt.toISOString(),
      travel_buffer_minutes: input.travelBufferMinutes,
      guest_count: input.guestCount,
      planner_name: input.plannerName,
      planner_email: input.plannerEmail,
      planner_phone: input.plannerPhone,
      special_instructions: input.specialInstructions,
      entrance_instructions: input.entranceInstructions,
      special_songs: input.specialSongs,
      venue_id: venueId,
    })
    .eq("id", lead.event_id);
  if (eErr) throw new Error(eErr.message);

  await refreshLeadAvailability(db, leadId);
  if (timeChanged) {
    await rescheduleUpcomingRuns(db, leadId, lead.bookings?.id ?? null);
    await audit({ actorId: actor.id, action: "event.rescheduled", entityType: "event", entityId: lead.event_id, before: lead.events, after: { eventDate: input.eventDate, startTime: input.startTime, durationMinutes: input.durationMinutes } });
  }
}
