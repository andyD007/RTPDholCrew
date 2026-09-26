import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { scanPipelineForFollowUps } from "@/lib/agents";
import { addDaysLocal, BUSINESS_TZ, todayLocal } from "@/lib/time";
import { conversionRate, monthBuckets, sumByMonth } from "./metrics";

const BOOKED = ["deposit_paid", "confirmed"] as const;

export async function getDashboardData(db: TypedSupabaseClient, now = new Date()) {
  const today = todayLocal(now);
  const in30 = addDaysLocal(today, 30);
  const yearAgo = new Date(now.getTime() - 365 * 86_400_000).toISOString();
  const buckets = monthBuckets(now, 12, BUSINESS_TZ);
  const monthStart = `${today.slice(0, 7)}-01`;

  const eventSelect = "id, reference, status, customers(first_name, last_name), events!inner(title, event_date, start_time, end_time, venues(name, city), event_types(name)), bookings(total_cents, amount_paid_cents)";
  const [todayRes, upcomingRes, newLeadsRes, contractsRes, depositsRes, balancesRes, paymentsRes, bookingsRes, leadsYearRes, followUps] = await Promise.all([
    db.from("leads").select(eventSelect).eq("events.event_date", today).in("status", [...BOOKED, "contract_signed", "deposit_pending"]).order("events(start_time)"),
    db.from("leads").select(eventSelect).gt("events.event_date", today).lte("events.event_date", in30).in("status", BOOKED).order("events(event_date)").limit(8),
    db.from("leads").select("id, reference, created_at, urgency, availability_status, customers(first_name, last_name), events!inner(title, event_date, event_types(name))", { count: "exact" }).eq("status", "new").order("created_at", { ascending: false }).limit(6),
    db.from("contracts").select("id", { count: "exact", head: true }).in("status", ["sent", "viewed"]),
    db.from("leads").select("id", { count: "exact", head: true }).in("status", ["contract_signed", "deposit_pending"]),
    db.from("bookings").select("total_cents, amount_paid_cents").in("status", ["confirmed", "completed"]),
    db.from("payments").select("amount_cents, refunded_cents, paid_at").eq("status", "paid").gte("paid_at", yearAgo),
    db.from("bookings").select("confirmed_at").not("confirmed_at", "is", null).gte("confirmed_at", yearAgo),
    db.from("leads").select("status").gte("created_at", yearAgo),
    scanPipelineForFollowUps(db, now),
  ]);
  for (const r of [todayRes, upcomingRes, newLeadsRes, balancesRes, paymentsRes, bookingsRes, leadsYearRes]) {
    if (r.error) throw new Error(`Dashboard query failed: ${r.error.message}`);
  }

  const revenue = sumByMonth((paymentsRes.data ?? []).map((p) => ({ at: p.paid_at, value: p.amount_cents - p.refunded_cents })), buckets, BUSINESS_TZ);
  const bookings = sumByMonth((bookingsRes.data ?? []).map((b) => ({ at: b.confirmed_at, value: 1 })), buckets, BUSINESS_TZ);
  const outstanding = (balancesRes.data ?? []).reduce((s, b) => s + Math.max(0, b.total_cents - b.amount_paid_cents), 0);
  const conversion = conversionRate((leadsYearRes.data ?? []).map((l) => l.status));

  return {
    today,
    monthStart,
    todayEvents: todayRes.data ?? [],
    upcomingEvents: upcomingRes.data ?? [],
    newLeads: newLeadsRes.data ?? [],
    newLeadCount: newLeadsRes.count ?? 0,
    awaitingContracts: contractsRes.count ?? 0,
    depositsPending: depositsRes.count ?? 0,
    outstandingBalanceCents: outstanding,
    monthBookings: bookings[bookings.length - 1]?.value ?? 0,
    monthRevenueCents: revenue[revenue.length - 1]?.value ?? 0,
    revenueSeries: revenue,
    bookingSeries: bookings,
    conversion,
    followUps,
  };
}
