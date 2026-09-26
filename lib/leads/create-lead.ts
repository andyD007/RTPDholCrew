import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { getSetting } from "@/lib/database/settings";
import { emitDomainEvent } from "@/lib/automation/events";
import { checkAvailability } from "@/lib/availability/service";
import type { AvailabilityResult } from "@/lib/availability/engine";
import { createAccessToken } from "@/lib/portal/access";
import { cleanLine, cleanText, normalizePhone } from "@/lib/security/sanitize";
import { eventWindow, formatEventDate } from "@/lib/time";
import type { AvailabilityRequest } from "@/lib/validation/booking";
import type { Json } from "@/types/database";

export type CreatedLead = {
  leadId: string;
  reference: string;
  customerId: string;
  eventId: string;
  accessToken: string;
  availability: AvailabilityResult;
};

/**
 * Persist a validated Check Availability request:
 * customer (upsert by email) → venue → event → lead → availability check →
 * magic link → `lead.created` domain event.
 *
 * Runs with the service-role client AFTER validation + rate limiting.
 */
export async function createLeadFromRequest(
  db: TypedSupabaseClient,
  input: AvailabilityRequest,
  meta: { utm?: Record<string, string> } = {},
): Promise<CreatedLead> {
  const [eventType, service, pkg, availabilityRules] = await Promise.all([
    db.from("event_types").select("id, name").eq("slug", input.eventType).maybeSingle(),
    input.service !== "custom"
      ? db.from("services").select("id, name, is_bookable").eq("slug", input.service).eq("is_active", true).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    input.packageSlug ? db.from("packages").select("id").eq("slug", input.packageSlug).maybeSingle() : Promise.resolve({ data: null, error: null }),
    getSetting("availability.rules", db),
  ]);
  if (!eventType.data) throw new LeadInputError("Unknown event type");
  if (input.service !== "custom" && !service.data) throw new LeadInputError("Unknown service");

  // ── Customer (existing customers keep their stored details; we only fill gaps) ──
  const email = input.email.toLowerCase();
  const phone = normalizePhone(input.phone);
  const { data: existing } = await db.from("customers").select("id, phone").eq("email", email).maybeSingle();
  let customerId: string;
  if (existing) {
    customerId = existing.id;
    if (!existing.phone) await db.from("customers").update({ phone }).eq("id", customerId);
  } else {
    const { data, error } = await db
      .from("customers")
      .insert({ first_name: cleanLine(input.firstName, 80), last_name: cleanLine(input.lastName, 80), email, phone })
      .select("id")
      .single();
    if (error) {
      // Concurrent submission with the same email: fall back to the row that won.
      const { data: raced } = await db.from("customers").select("id").eq("email", email).single();
      if (!raced) throw new Error(`Failed to save customer: ${error.message}`);
      customerId = raced.id;
    } else customerId = data.id;
  }

  // ── Venue ──
  const { data: venue, error: venueErr } = await db
    .from("venues")
    .insert({
      name: cleanLine(input.venueName, 160),
      street: input.street ? cleanLine(input.street, 200) : null,
      city: cleanLine(input.city, 80),
      state: input.state.toUpperCase(),
      postal_code: input.postalCode ?? null,
    })
    .select("id")
    .single();
  if (venueErr) throw new Error(`Failed to save venue: ${venueErr.message}`);

  // ── Event ──
  const window = eventWindow(input.eventDate, input.startTime, input.durationMinutes);
  const title = `${cleanLine(input.lastName, 80)} ${eventType.data.name}`;
  const { data: event, error: eventErr } = await db
    .from("events")
    .insert({
      event_type_id: eventType.data.id,
      title,
      event_date: input.eventDate,
      start_time: input.startTime,
      end_time: window.endTime,
      duration_minutes: input.durationMinutes,
      starts_at: window.startsAt.toISOString(),
      ends_at: window.endsAt.toISOString(),
      travel_buffer_minutes: availabilityRules.defaultTravelBufferMinutes,
      venue_id: venue.id,
      guest_count: input.guestCount ?? null,
      planner_name: input.plannerName ? cleanLine(input.plannerName, 120) : null,
      planner_email: input.plannerEmail ?? null,
      special_instructions: input.specialInstructions ? cleanText(input.specialInstructions, 2000) : null,
    })
    .select("id")
    .single();
  if (eventErr) throw new Error(`Failed to save event: ${eventErr.message}`);

  // ── Availability (advisory — never auto-declines) ──
  const availability = await checkAvailability(db, {
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    travelBufferMinutes: availabilityRules.defaultTravelBufferMinutes,
    localDate: input.eventDate,
    city: input.city,
  });

  // ── Lead ──
  const { data: reference, error: refErr } = await db.rpc("next_document_number", { p_scope: "L" });
  if (refErr || !reference) throw new Error(`Failed to allocate lead reference: ${refErr?.message}`);
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .insert({
      reference,
      customer_id: customerId,
      event_id: event.id,
      service_id: service.data?.id ?? null,
      package_id: pkg.data?.id ?? null,
      requested_service_label: input.service === "custom" ? cleanLine(input.customService ?? "Custom", 200) : service.data?.name ?? null,
      status: "new",
      availability_status: availability.status,
      availability_checked_at: new Date().toISOString(),
      availability_details: { summary: availability.summary, conflicts: availability.conflicts, computedStatus: availability.status } as unknown as Json,
      message: input.specialInstructions ? cleanText(input.specialInstructions, 2000) : null,
      source: input.source ? cleanLine(input.source, 60) : "website",
      utm: (meta.utm ?? {}) as Json,
    })
    .select("id")
    .single();
  if (leadErr) throw new Error(`Failed to save lead: ${leadErr.message}`);

  const accessToken = await createAccessToken(lead.id);
  await emitDomainEvent({
    type: "lead.created",
    leadId: lead.id,
    actor: "customer",
    payload: {
      reference,
      eventType: eventType.data.name,
      eventDate: formatEventDate(input.eventDate),
      availability: availability.status,
    },
  });

  return { leadId: lead.id, reference, customerId, eventId: event.id, accessToken, availability };
}

export class LeadInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeadInputError";
  }
}
