import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock } from "lucide-react";
import { requireStaff } from "@/lib/auth/admin";
import { getDashboardData } from "@/lib/admin/dashboard";
import { formatMoney } from "@/lib/money";
import { formatShortDate, formatTimeRange } from "@/lib/time";
import { AvailabilityBadge, LeadStatusBadge, PageHeader, Panel, StatCard } from "@/components/admin/ui";
import { MonthChart } from "@/components/admin/month-chart";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  respond_to_new_lead: "Reply to lead",
  send_follow_up: "Follow up on quote",
  send_contract_reminder: "Contract reminder",
  send_deposit_reminder: "Deposit reminder",
  confirm_event_details: "Confirm details",
  collect_balance: "Collect balance",
};

export default async function DashboardPage() {
  const { db, profile } = await requireStaff();
  const d = await getDashboardData(db);
  const greeting = profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : "";

  return (
    <>
      <PageHeader
        title={`Welcome back${greeting}`}
        description={`${d.todayEvents.length ? `${d.todayEvents.length} event${d.todayEvents.length > 1 ? "s" : ""} today` : "No events today"} · ${d.newLeadCount} new lead${d.newLeadCount === 1 ? "" : "s"}`}
        actions={
          <Button asChild size="sm">
            <Link href="/admin/leads">Open pipeline</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Today's events" value={d.todayEvents.length} href="/admin/calendar" tone={d.todayEvents.length ? "gold" : undefined} />
        <StatCard label="Upcoming (30 days)" value={d.upcomingEvents.length} href="/admin/calendar" />
        <StatCard label="New leads" value={d.newLeadCount} href="/admin/leads?status=new" tone={d.newLeadCount ? "gold" : undefined} />
        <StatCard label="Quote follow-ups" value={d.followUps.filter((f) => f.action === "send_follow_up").length} href="#follow-ups" />
        <StatCard label="Awaiting contracts" value={d.awaitingContracts} href="/admin/quotes" />
        <StatCard label="Deposits pending" value={d.depositsPending} href="/admin/leads?status=contract_signed,deposit_pending" tone={d.depositsPending ? "warning" : undefined} />
        <StatCard label="Remaining balances" value={formatMoney(d.outstandingBalanceCents)} href="/admin/payments" />
        <StatCard label="Bookings this month" value={d.monthBookings} />
        <StatCard label="Revenue this month" value={formatMoney(d.monthRevenueCents)} tone="success" href="/admin/payments" />
        <StatCard
          label="Lead conversion"
          value={d.conversion.rate === null ? "—" : `${Math.round(d.conversion.rate * 100)}%`}
          hint={`${d.conversion.won} won of ${d.conversion.decided} decided (12 mo)`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Today & upcoming" className="xl:col-span-2" action={<Link href="/admin/calendar" className="text-xs text-muted-foreground hover:text-foreground">Calendar →</Link>}>
          {d.todayEvents.length + d.upcomingEvents.length === 0 ? (
            <EmptyState icon={<CalendarClock />} title="Nothing on the books yet" description="Confirmed bookings in the next 30 days will appear here." />
          ) : (
            <ul className="divide-y divide-border">
              {[...d.todayEvents.map((e) => ({ ...e, today: true })), ...d.upcomingEvents.map((e) => ({ ...e, today: false }))].map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/leads/${e.id}`} className="flex items-center gap-4 py-3 transition hover:opacity-80">
                    <div className="w-16 shrink-0 text-center">
                      <p className={`text-xs font-semibold uppercase ${e.today ? "text-gold" : "text-muted-foreground"}`}>{e.today ? "Today" : formatShortDate(e.events.event_date).split(",")[0]}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeRange(e.events.start_time).replace(":00", "")}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.events.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[e.events.venues?.name, e.events.venues?.city].filter(Boolean).join(", ")} · {e.customers?.first_name} {e.customers?.last_name}
                      </p>
                    </div>
                    {e.bookings && e.bookings.total_cents > e.bookings.amount_paid_cents ? (
                      <Badge tone="warning">{formatMoney(e.bookings.total_cents - e.bookings.amount_paid_cents)} due</Badge>
                    ) : (
                      <LeadStatusBadge status={e.status} />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="New leads" action={<Link href="/admin/leads?status=new" className="text-xs text-muted-foreground hover:text-foreground">All →</Link>}>
          {d.newLeads.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <ul className="divide-y divide-border">
              {d.newLeads.map((l) => (
                <li key={l.id}>
                  <Link href={`/admin/leads/${l.id}`} className="block py-3 transition hover:opacity-80">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{l.events.title}</p>
                      {l.urgency === "urgent" || l.urgency === "high" ? <Badge tone="danger">{l.urgency}</Badge> : null}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{formatShortDate(l.events.event_date)} · {l.events.event_types?.name}</span>
                      <AvailabilityBadge status={l.availability_status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Monthly bookings">
          <MonthChart data={d.bookingSeries} label="Bookings" />
        </Panel>
        <Panel title="Monthly revenue">
          <MonthChart data={d.revenueSeries} format="currency" label="Revenue" />
        </Panel>
      </div>

      <div id="follow-ups" className="mt-6 scroll-mt-20">
        <Panel title="Needs attention — follow-up agent">
          {d.followUps.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No follow-ups needed right now.</p>
          ) : (
            <ul className="divide-y divide-border">
              {d.followUps.slice(0, 12).map((f) => (
                <li key={f.leadId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {f.priority === "high" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> : <span className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground" />}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {f.eventTitle} <span className="text-muted-foreground">· {f.name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{f.reason}</p>
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/leads/${f.leadId}#messages`}>
                      {ACTION_LABELS[f.action] ?? "Open"} <ArrowRight />
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
