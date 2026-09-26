import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CloudSun, MapPin, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth/admin";
import { loadLeadContext, customerName, serviceLabel } from "@/lib/leads/context";
import type { EventBriefOutput } from "@/lib/agents/types";
import { formatVenue } from "@/lib/contracts/render";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatDuration, formatEventDate, formatTimeRange } from "@/lib/time";
import { formatPhone } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";
import { BriefActions } from "@/components/admin/brief-actions";

export const metadata: Metadata = { title: "Event brief" };
export const dynamic = "force-dynamic";

export default async function EventBriefPage({ params }: PageProps<"/admin/leads/[id]/brief">) {
  const { id } = await params;
  const { db } = await requireStaff();
  const ctx = await loadLeadContext(db, id);
  if (!ctx) notFound();
  const [{ data: gen }, { data: notes }] = await Promise.all([
    db.from("ai_generations").select("output, provider, created_at").eq("lead_id", id).eq("agent", "event_prep").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("admin_notes").select("body").eq("lead_id", id).order("is_pinned", { ascending: false }).limit(5),
  ]);
  const brief = gen?.output as EventBriefOutput | undefined;
  const ev = ctx.event;
  const outdoor = ev.venue?.setting === "outdoor" || ev.venue?.setting === "mixed";
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatVenue(ev.venue))}`;

  return (
    <>
      <div className="no-print">
        <PageHeader back={{ href: `/admin/leads/${id}`, label: ev.title }} title="Event brief" description={gen ? `Generated ${formatDateTime(gen.created_at)} · ${gen.provider === "rules" ? "rule-based" : gen.provider}` : "Not generated yet — facts below are live from the booking."} actions={<BriefActions leadId={id} />} />
      </div>
      <article className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-5 print:border-0 print:bg-white print:p-0 print:text-black sm:p-8">
        <header className="border-b border-border pb-4 print:border-black/20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold print:text-black">RTP Dhol Crew · Event brief</p>
          <h1 className="mt-2 text-2xl font-bold">{brief?.title ?? ev.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground print:text-black/70">
            {ev.eventType?.name} · {formatEventDate(ev.event_date)} · {formatTimeRange(ev.start_time, ev.end_time)} ({formatDuration(ev.duration_minutes)})
          </p>
        </header>

        <section className="grid gap-4 border-b border-border py-4 text-sm sm:grid-cols-2 print:border-black/20">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Customer</p>
            <p className="font-semibold">{customerName(ctx)}</p>
            {ctx.customer.phone ? (
              <a href={`tel:${ctx.customer.phone}`} className="flex items-center gap-1.5 text-gold print:text-black">
                <Phone className="size-3.5" /> {formatPhone(ctx.customer.phone)}
              </a>
            ) : null}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Planner</p>
            <p className="font-semibold">{ev.planner_name ?? "—"}</p>
            {ev.planner_phone ? (
              <a href={`tel:${ev.planner_phone}`} className="flex items-center gap-1.5 text-gold print:text-black">
                <Phone className="size-3.5" /> {formatPhone(ev.planner_phone)}
              </a>
            ) : ev.planner_email ? (
              <p className="text-muted-foreground">{ev.planner_email}</p>
            ) : null}
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Venue</p>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-start gap-1.5 font-semibold hover:text-gold">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gold print:text-black" /> {formatVenue(ev.venue)}
            </a>
            <p className="mt-1 text-muted-foreground print:text-black/70">Parking / load-in: {ev.venue?.parking_notes ?? "not provided — confirm on arrival"}</p>
          </div>
        </section>

        {brief?.keyTimes?.length ? (
          <Section title="Key times">
            <ul className="grid gap-1">
              {brief.keyTimes.map((t) => (
                <li key={t.time + t.label} className="flex gap-4">
                  <span className="w-20 shrink-0 font-mono font-semibold">{t.time}</span> {t.label}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title="Performance">
          <ul className="grid gap-1">
            <li>Service: {serviceLabel(ctx)}</li>
            <li>Start: {formatTimeRange(ev.start_time)} · Duration: {formatDuration(ev.duration_minutes)}</li>
            <li>Guests: {ev.guest_count ? `~${ev.guest_count}` : "unknown"}</li>
            <li>Entrance cues: {ev.entrance_instructions ?? "—"}</li>
            <li>Special songs: {ev.special_songs ?? "—"}</li>
            <li>Special requests: {ev.special_instructions ?? "—"}</li>
          </ul>
        </Section>

        {brief ? (
          <>
            {brief.logistics.length ? <ListSection title="Logistics" items={brief.logistics} /> : null}
            {brief.musicAndCues.length ? <ListSection title="Music & cues" items={brief.musicAndCues} /> : null}
            {brief.watchOuts.length ? <ListSection title="Watch-outs" items={brief.watchOuts} /> : null}
          </>
        ) : null}

        {outdoor ? (
          <Section title="Weather">
            <p className="flex items-center gap-2 text-muted-foreground print:text-black/70">
              <CloudSun className="size-4 text-gold print:text-black" /> Outdoor event — check the forecast 48 hours before and confirm the covered backup location. (Forecast integration placeholder.)
            </p>
          </Section>
        ) : null}

        <Section title="Payment">
          <p>
            Total {formatMoney(ctx.money.totalCents, { showCents: true })} · Paid {formatMoney(ctx.money.paidCents, { showCents: true })} ·{" "}
            <strong className={ctx.money.balanceCents ? "text-warning print:text-black" : ""}>Balance {formatMoney(ctx.money.balanceCents, { showCents: true })}</strong>
          </p>
          <p className="text-muted-foreground print:text-black/70">{ctx.money.depositPaid ? "Deposit received." : "Deposit NOT recorded."}</p>
        </Section>

        {notes?.length ? <ListSection title="Team notes" items={notes.map((n) => n.body)} /> : null}
        <p className="pt-4 text-center text-[10px] text-subtle print:text-black/50">
          {ctx.reference} · {ctx.booking?.number ?? ""} · Printed {formatDateTime(new Date())}
        </p>
      </article>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border py-4 text-sm print:border-black/20">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground print:text-black/60">{title}</h2>
      {children}
    </section>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <Section title={title}>
      <ul className="grid list-inside list-disc gap-1">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </Section>
  );
}
