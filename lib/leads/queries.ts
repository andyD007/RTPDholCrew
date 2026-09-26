import "server-only";
import { z } from "zod";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { LEAD_STATUSES, type LeadStatus } from "./status";

export const leadFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(",").filter((s): s is LeadStatus => (LEAD_STATUSES as string[]).includes(s)) : []))
    .catch([]),
  type: z.string().regex(/^[a-z0-9-]+$/).optional().catch(undefined),
  service: z.string().regex(/^[a-z0-9-]+$/).optional().catch(undefined),
  city: z.string().trim().max(80).optional().catch(undefined),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  view: z.enum(["board", "table"]).catch("board"),
  showClosed: z
    .string()
    .optional()
    .transform((v) => v === "1")
    .catch(false),
});
export type LeadFilters = z.output<typeof leadFiltersSchema>;

/** Strip characters that are meaningful in PostgREST filter syntax. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%,()*\\:"']/g, " ").replace(/\s+/g, " ").trim();
}

const LEAD_LIST_SELECT =
  "id, reference, status, availability_status, urgency, created_at, status_changed_at, estimated_value_cents, customers!inner(first_name, last_name, email, phone), services(slug, name), events!inner(title, event_date, start_time, end_time, event_types(slug, name), venues(name, city)), quotes(total_cents, status, created_at), bookings(total_cents, amount_paid_cents, status)";

export async function listLeads(db: TypedSupabaseClient, f: LeadFilters) {
  let query = db.from("leads").select(LEAD_LIST_SELECT).order("created_at", { ascending: false }).limit(500);
  if (f.status.length) query = query.in("status", f.status);
  else if (!f.showClosed && f.view === "table") query = query.not("status", "in", "(lost,cancelled)");
  // Resolve lookups to IDs so optional relations never need inner joins.
  if (f.type) {
    const { data } = await db.from("event_types").select("id").eq("slug", f.type).maybeSingle();
    query = query.eq("events.event_type_id", data?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (f.city) {
    const { data } = await db.from("venues").select("id").ilike("city", sanitizeSearch(f.city)).limit(500);
    const ids = (data ?? []).map((v) => v.id);
    query = query.in("events.venue_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  if (f.service) {
    const { data } = await db.from("services").select("id").eq("slug", f.service).maybeSingle();
    query = query.eq("service_id", data?.id ?? "00000000-0000-0000-0000-000000000000");
  }
  if (f.from) query = query.gte("events.event_date", f.from);
  if (f.to) query = query.lte("events.event_date", f.to);

  if (f.q) {
    const term = sanitizeSearch(f.q);
    if (term) {
      const like = `%${term}%`;
      const digits = term.replace(/\D/g, "");
      const [customers, venues] = await Promise.all([
        db
          .from("customers")
          .select("id")
          .or([`first_name.ilike.${like}`, `last_name.ilike.${like}`, `email.ilike.${like}`, ...(digits.length >= 4 ? [`phone.ilike.%${digits}%`] : [])].join(","))
          .limit(200),
        db.from("venues").select("id").or(`name.ilike.${like},city.ilike.${like}`).limit(200),
      ]);
      const venueIds = (venues.data ?? []).map((v) => v.id);
      const events = venueIds.length ? await db.from("events").select("id").in("venue_id", venueIds).limit(200) : { data: [] as { id: string }[] };
      const customerIds = (customers.data ?? []).map((c) => c.id);
      const eventIds = (events.data ?? []).map((e) => e.id);
      const ors = [`reference.ilike.${like}`];
      if (customerIds.length) ors.push(`customer_id.in.(${customerIds.join(",")})`);
      if (eventIds.length) ors.push(`event_id.in.(${eventIds.join(",")})`);
      query = query.or(ors.join(","));
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load leads: ${error.message}`);
  return (data ?? []).map((l) => {
    const quote = [...(l.quotes ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const value = l.bookings?.total_cents ?? quote?.total_cents ?? l.estimated_value_cents ?? null;
    return {
      id: l.id,
      reference: l.reference,
      status: l.status,
      availability: l.availability_status,
      urgency: l.urgency,
      createdAt: l.created_at,
      customer: `${l.customers.first_name} ${l.customers.last_name}`,
      email: l.customers.email,
      phone: l.customers.phone,
      eventTitle: l.events.title,
      eventType: l.events.event_types?.name ?? "Event",
      eventDate: l.events.event_date,
      startTime: l.events.start_time,
      endTime: l.events.end_time,
      venue: l.events.venues?.name ?? null,
      city: l.events.venues?.city ?? null,
      service: l.services?.name ?? null,
      valueCents: value,
      balanceCents: l.bookings ? l.bookings.total_cents - l.bookings.amount_paid_cents : null,
    };
  });
}

export type LeadListItem = Awaited<ReturnType<typeof listLeads>>[number];

export async function listFilterOptions(db: TypedSupabaseClient) {
  const [types, services, cities] = await Promise.all([
    db.from("event_types").select("slug, name").order("sort_order"),
    db.from("services").select("slug, name").order("sort_order"),
    db.from("venues").select("city").limit(1000),
  ]);
  const citySet = [...new Set((cities.data ?? []).map((c) => c.city.trim()).filter(Boolean))].sort();
  return { eventTypes: types.data ?? [], services: services.data ?? [], cities: citySet };
}
