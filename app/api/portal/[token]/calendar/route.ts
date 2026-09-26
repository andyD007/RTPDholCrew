import { NextResponse } from "next/server";
import { loadPortal } from "@/lib/portal/load";
import { buildIcsCalendar } from "@/lib/calendar/ics";
import { bookingCalendarEvent } from "@/lib/calendar/sync";

export const dynamic = "force-dynamic";

/** "Add to calendar" download for the customer. */
export async function GET(_req: Request, ctx: RouteContext<"/api/portal/[token]/calendar">) {
  const { token } = await ctx.params;
  const portal = await loadPortal(token);
  if (!portal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const ics = buildIcsCalendar([bookingCalendarEvent(portal.ctx, "customer")], "RTP Dhol Crew booking");
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="rtp-dhol-crew.ics"', "Cache-Control": "private, no-store" },
  });
}
