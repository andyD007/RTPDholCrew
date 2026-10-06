import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Rss } from "lucide-react";
import { requireStaff } from "@/lib/auth/admin";
import { monthGrid, shiftMonth, weekDays } from "@/lib/admin/calendar";
import { LEAD_STATUS_META, type LeadStatus } from "@/lib/leads/status";
import { addDaysLocal, formatTime12, todayLocal } from "@/lib/time";
import { sign } from "@/lib/security/tokens";
import { absoluteUrl, cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { CopyField } from "@/components/admin/copy-field";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

type CalEvent = { id: string; title: string; date: string; start: string; status: LeadStatus; city: string | null };

const LEGEND: LeadStatus[] = ["new", "quote_sent", "contract_sent", "contract_signed", "deposit_pending", "confirmed", "completed"];

export default async function CalendarPage({ searchParams }: PageProps<"/admin/calendar">) {
  const { db } = await requireStaff();
  const sp = await searchParams;
  const view = sp.view === "week" ? "week" : "month";
  const today = todayLocal();
  const anchor = typeof sp.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : today;
  const days = view === "month" ? monthGrid(anchor).flat() : weekDays(anchor);
  const from = days[0];
  const to = days[days.length - 1];

  const { data, error } = await db
    .from("leads")
    .select("id, status, events!inner(title, event_date, start_time, venues(city))")
    .gte("events.event_date", from)
    .lte("events.event_date", to)
    .not("status", "in", "(lost,cancelled)")
    .order("events(start_time)");
  const events: CalEvent[] = (data ?? []).map((l) => ({ id: l.id, title: l.events.title, date: l.events.event_date, start: l.events.start_time, status: l.status, city: l.events.venues?.city ?? null }));
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);

  const prev = view === "month" ? shiftMonth(anchor, -1) : addDaysLocal(anchor, -7);
  const next = view === "month" ? shiftMonth(anchor, 1) : addDaysLocal(anchor, 7);
  const label = view === "month" ? new Date(`${anchor.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }) : `Week of ${new Date(`${from}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
  const href = (d: string, v = view) => `/admin/calendar?view=${v}&date=${d}`;
  // The subscription link must never take the calendar down with it.
  let feedUrl: string | null = null;
  try {
    feedUrl = absoluteUrl(`/api/calendar/feed?key=${sign("calendar-feed-v1")}`);
  } catch (e) {
    console.error("[calendar] could not build the feed URL", e);
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Booked, pending and in-progress events. Lost and cancelled leads are hidden."
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border p-0.5">
              {(["month", "week"] as const).map((v) => (
                <Link key={v} href={href(anchor, v)} className={cn("rounded-md px-3 py-1.5 text-xs font-medium capitalize", view === v ? "bg-white/10" : "text-muted-foreground")}>
                  {v}
                </Link>
              ))}
            </div>
            <Button asChild size="icon-sm" variant="outline" aria-label="Previous">
              <Link href={href(prev)}>
                <ChevronLeft />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={href(today)}>Today</Link>
            </Button>
            <Button asChild size="icon-sm" variant="outline" aria-label="Next">
              <Link href={href(next)}>
                <ChevronRight />
              </Link>
            </Button>
          </div>
        }
      />
      {error ? (
        <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Couldn&apos;t load events for this view: {error.message}
        </p>
      ) : null}
      <h2 className="mb-3 text-lg font-semibold">{label}</h2>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <div className="grid min-w-[720px] grid-cols-7 border-b border-border bg-elevated text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid min-w-[720px] grid-cols-7">
          {days.map((d) => {
            const inMonth = view === "week" || d.slice(0, 7) === anchor.slice(0, 7);
            const list = byDay.get(d) ?? [];
            return (
              <div key={d} className={cn("min-w-0 border-b border-r border-border p-1.5 [&:nth-child(7n)]:border-r-0", view === "week" ? "min-h-72" : "min-h-28", !inMonth && "bg-white/[0.015]")}>
                <p className={cn("mb-1 flex size-6 items-center justify-center rounded-full text-xs", d === today ? "bg-gold font-bold text-primary-foreground" : inMonth ? "text-foreground/80" : "text-subtle")}>{Number(d.slice(8))}</p>
                <ul className="grid min-w-0 gap-1">
                  {list.map((e) => {
                    const meta = LEAD_STATUS_META[e.status];
                    const firm = e.status === "confirmed" || e.status === "deposit_paid" || e.status === "completed";
                    return (
                      <li key={e.id}>
                        <Link
                          href={`/admin/leads/${e.id}`}
                          className={cn("block truncate rounded-md border-l-2 px-1.5 py-1 text-[11px] leading-tight transition hover:brightness-125", firm ? "text-foreground" : "border-dashed text-foreground/80")}
                          style={{ borderLeftColor: meta.color, background: `${meta.color}${firm ? "33" : "1a"}` }}
                          title={`${e.title} · ${meta.label}`}
                        >
                          <span className="font-semibold">{formatTime12(e.start).replace(":00", "")}</span> {e.title}
                          {view === "week" && e.city ? <span className="block text-[10px] text-muted-foreground">{e.city} · {meta.label}</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {LEGEND.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: LEAD_STATUS_META[s].color }} /> {LEAD_STATUS_META[s].label}
          </span>
        ))}
        <span>· Solid = booked, faded = pending</span>
      </div>
      <div className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Rss className="size-4 text-gold" /> Subscribe on your phone
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Add this private URL to Google Calendar or Apple Calendar (&ldquo;Subscribe to calendar&rdquo;). Keep it secret. Google Calendar sync can also be enabled with a service account (see README).</p>
        {feedUrl ? (
          <CopyField value={feedUrl} className="mt-3" />
        ) : (
          <p className="mt-3 text-xs text-warning">The subscription link is unavailable right now. Set APP_SECRET (32+ characters) in your hosting settings and redeploy.</p>
        )}
      </div>
    </>
  );
}
