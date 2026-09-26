import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, FilePlus2, Mail, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth/admin";
import { loadLeadContext, customerName, serviceLabel } from "@/lib/leads/context";
import { EVENT_LABELS } from "@/lib/automation/events";
import { formatDateTime, formatDuration, formatEventDate, formatTimeRange } from "@/lib/time";
import { formatMoney } from "@/lib/money";
import { formatPhone } from "@/lib/utils";
import { formatVenue } from "@/lib/contracts/render";
import type { LeadIntakeOutput } from "@/lib/agents/types";
import { KeyValue, PageHeader, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { StatusControl } from "@/components/admin/lead-detail/status-control";
import { AvailabilityControl } from "@/components/admin/lead-detail/availability-control";
import { AiSummaryPanel } from "@/components/admin/lead-detail/ai-summary";
import { EventDetailsEditor } from "@/components/admin/lead-detail/event-editor";
import { NotesPanel } from "@/components/admin/lead-detail/notes";
import { MessagesPanel } from "@/components/admin/lead-detail/messages";
import { PortalLinkButton } from "@/components/admin/lead-detail/portal-link";
import { SalesPanel } from "@/components/admin/lead-detail/sales-panel";
import { PaymentsPanel } from "@/components/admin/lead-detail/payments-panel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/leads/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Lead ${id.slice(0, 8)}` };
}

export default async function LeadDetailPage({ params }: PageProps<"/admin/leads/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { db, profile } = await requireStaff();
  const ctx = await loadLeadContext(db, id);
  if (!ctx) notFound();

  const [{ data: events }, { data: notes }, { data: messages }, { data: runs }] = await Promise.all([
    db.from("domain_events").select("id, type, actor, occurred_at, payload").eq("lead_id", id).order("occurred_at", { ascending: true }),
    db.from("admin_notes").select("id, body, is_pinned, created_at, users(full_name, email)").eq("lead_id", id).order("is_pinned", { ascending: false }).order("created_at", { ascending: false }),
    db.from("messages").select("*").eq("lead_id", id).order("created_at", { ascending: false }).limit(100),
    db.from("automation_runs").select("id, status, scheduled_for, automation_rules(name)").eq("lead_id", id).eq("status", "pending").order("scheduled_for"),
  ]);

  const summary = ctx.ai_summary as (LeadIntakeOutput & { provider?: string }) | null;
  const ev = ctx.event;
  const isAdmin = profile.role !== "staff";

  return (
    <>
      <PageHeader
        back={{ href: "/admin/leads", label: "Leads" }}
        title={ev.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-xs">{ctx.reference}</span>
            <span>{formatEventDate(ev.event_date)} · {formatTimeRange(ev.start_time, ev.end_time)}</span>
            {ctx.urgency === "urgent" || ctx.urgency === "high" ? <Badge tone="danger">{ctx.urgency}</Badge> : null}
          </span>
        }
        actions={
          <>
            <PortalLinkButton leadId={ctx.id} canRevoke={isAdmin} />
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/leads/${ctx.id}/brief`}>
                <ClipboardList /> Event brief
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/admin/leads/${ctx.id}/quote`}>
                <FilePlus2 /> {ctx.latestQuote ? "New quote" : "Create quote"}
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <StatusControl leadId={ctx.id} status={ctx.status} />
        <AvailabilityControl
          leadId={ctx.id}
          status={ctx.availability_status}
          overridden={ctx.availability_override}
          summary={(ctx.availability_details as { summary?: string } | null)?.summary ?? null}
          checkedAt={ctx.availability_checked_at}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid content-start gap-6 xl:col-span-2">
          <AiSummaryPanel leadId={ctx.id} summary={summary} />

          <Panel
            title="Event"
            action={
              <EventDetailsEditor
                leadId={ctx.id}
                initial={{
                  title: ev.title,
                  eventDate: ev.event_date,
                  startTime: ev.start_time.slice(0, 5),
                  durationMinutes: ev.duration_minutes,
                  travelBufferMinutes: ev.travel_buffer_minutes,
                  guestCount: ev.guest_count,
                  plannerName: ev.planner_name ?? "",
                  plannerEmail: ev.planner_email ?? "",
                  plannerPhone: ev.planner_phone ?? "",
                  specialInstructions: ev.special_instructions ?? "",
                  entranceInstructions: ev.entrance_instructions ?? "",
                  specialSongs: ev.special_songs ?? "",
                  venueName: ev.venue?.name ?? "",
                  street: ev.venue?.street ?? "",
                  city: ev.venue?.city ?? "",
                  state: ev.venue?.state ?? "NC",
                  postalCode: ev.venue?.postal_code ?? "",
                  setting: (ev.venue?.setting as "indoor" | "outdoor" | "mixed" | "unknown") ?? "unknown",
                  parkingNotes: ev.venue?.parking_notes ?? "",
                }}
              />
            }
          >
            <KeyValue
              items={[
                { label: "Event type", value: ev.eventType?.name },
                { label: "Service", value: serviceLabel(ctx) },
                { label: "Date", value: formatEventDate(ev.event_date) },
                { label: "Performance", value: `${formatTimeRange(ev.start_time, ev.end_time)} · ${formatDuration(ev.duration_minutes)}` },
                { label: "Venue", value: formatVenue(ev.venue) },
                { label: "Setting", value: ev.venue?.setting && ev.venue.setting !== "unknown" ? ev.venue.setting : null },
                { label: "Guests", value: ev.guest_count ? `~${ev.guest_count}` : null },
                { label: "Travel buffer", value: `${ev.travel_buffer_minutes} min` },
                { label: "Parking / load-in", value: ev.venue?.parking_notes },
                { label: "Entrance cues", value: ev.entrance_instructions },
                { label: "Special songs", value: ev.special_songs },
                { label: "Special instructions", value: ev.special_instructions },
              ]}
            />
            {ctx.message ? (
              <div className="mt-5 rounded-xl border border-border bg-white/[0.02] p-4">
                <p className="text-xs text-muted-foreground">Customer message</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{ctx.message}</p>
              </div>
            ) : null}
          </Panel>

          <SalesPanel ctx={JSON.parse(JSON.stringify(ctx))} isAdmin={isAdmin} />
          <PaymentsPanel ctx={JSON.parse(JSON.stringify(ctx))} isAdmin={isAdmin} />
          <MessagesPanel leadId={ctx.id} messages={messages ?? []} customer={{ email: ctx.customer.email, phone: ctx.customer.phone }} />
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Customer">
            <p className="font-semibold">{customerName(ctx)}</p>
            <div className="mt-3 grid gap-2 text-sm">
              <a href={`mailto:${ctx.customer.email}`} className="flex items-center gap-2 text-foreground/80 hover:text-gold">
                <Mail className="size-4 text-subtle" /> {ctx.customer.email}
              </a>
              {ctx.customer.phone ? (
                <a href={`tel:${ctx.customer.phone}`} className="flex items-center gap-2 text-foreground/80 hover:text-gold">
                  <Phone className="size-4 text-subtle" /> {formatPhone(ctx.customer.phone)}
                </a>
              ) : null}
            </div>
            {ev.planner_name ? (
              <div className="mt-4 border-t border-border pt-4 text-sm">
                <p className="text-xs text-muted-foreground">Planner</p>
                <p className="font-medium">{ev.planner_name}</p>
                {ev.planner_email ? <p className="text-foreground/80">{ev.planner_email}</p> : null}
                {ev.planner_phone ? <p className="text-foreground/80">{formatPhone(ev.planner_phone)}</p> : null}
              </div>
            ) : null}
            <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
              Source: {ctx.source} · Created {formatDateTime(ctx.created_at)}
              {ctx.money.totalCents ? (
                <p className="mt-1">
                  Value {formatMoney(ctx.money.totalCents)} · Paid {formatMoney(ctx.money.paidCents)}
                </p>
              ) : null}
            </div>
          </Panel>

          <NotesPanel
            leadId={ctx.id}
            canDelete={isAdmin}
            notes={(notes ?? []).map((n) => ({ id: n.id, body: n.body, pinned: n.is_pinned, createdAt: n.created_at, author: n.users?.full_name ?? n.users?.email ?? "Team" }))}
          />

          <Panel title="Timeline">
            <ol className="relative grid gap-4 border-l border-border pl-5">
              {(events ?? []).map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-background bg-gold" aria-hidden />
                  <p className="text-sm font-medium">{EVENT_LABELS[e.type] ?? e.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(e.occurred_at)} · {e.actor.startsWith("admin:") ? "team" : e.actor}
                    {e.type === "lead.status_changed" ? ` · ${(e.payload as { from?: string }).from} → ${(e.payload as { to?: string }).to}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>

          {runs?.length ? (
            <Panel title="Scheduled automations">
              <ul className="grid gap-2 text-sm">
                {runs.map((r) => (
                  <li key={r.id} className="flex justify-between gap-3">
                    <span>{r.automation_rules?.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(r.scheduled_for)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
