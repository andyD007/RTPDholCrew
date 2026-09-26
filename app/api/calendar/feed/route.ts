import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/database/server";
import { buildIcsCalendar } from "@/lib/calendar/ics";
import { bookingCalendarEvent } from "@/lib/calendar/sync";
import { loadLeadContext } from "@/lib/leads/context";
import { sign, safeEqual } from "@/lib/security/tokens";

export const dynamic = "force-dynamic";

/**
 * Private iCalendar subscription feed of confirmed & pending bookings for the
 * team's phones (Settings shows the URL). Authenticated by an HMAC key.
 */
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!isSupabaseConfigured() || !safeEqual(key, sign("calendar-feed-v1"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createServiceClient();
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data } = await db.from("bookings").select("lead_id, leads!inner(events!inner(starts_at))").in("status", ["pending", "confirmed", "completed"]).gte("leads.events.starts_at", since).limit(500);
  const contexts = await Promise.all((data ?? []).map((b) => loadLeadContext(db, b.lead_id)));
  const ics = buildIcsCalendar(contexts.filter((c) => c !== null).map((c) => bookingCalendarEvent(c, "internal")), "RTP Dhol Crew bookings");
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" } });
}
