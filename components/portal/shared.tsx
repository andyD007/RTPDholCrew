import Link from "next/link";
import { Check, LinkIcon } from "lucide-react";
import type { PortalStage } from "@/lib/portal/load";
import type { LeadContext } from "@/lib/leads/context";
import { formatVenue } from "@/lib/contracts/render";
import { formatDuration, formatEventDate, formatTimeRange } from "@/lib/time";
import { serviceLabel } from "@/lib/leads/context";
import { cn } from "@/lib/utils";

const STAGES: { key: PortalStage; label: string }[] = [
  { key: "request", label: "Request" },
  { key: "quote", label: "Quote" },
  { key: "contract", label: "Contract" },
  { key: "deposit", label: "Deposit" },
  { key: "booked", label: "Booked" },
];

export function StageTracker({ stage }: { stage: PortalStage }) {
  const order = STAGES.findIndex((s) => s.key === (stage === "complete" ? "booked" : stage));
  return (
    <ol className="grid grid-cols-5 gap-1.5" aria-label="Booking progress">
      {STAGES.map((s, i) => {
        const done = i < order || stage === "complete" || (stage === "booked" && i === order);
        const current = i === order && !done;
        return (
          <li key={s.key} className="grid gap-2" aria-current={current ? "step" : undefined}>
            <span className={cn("h-1.5 rounded-full", done ? "bg-gold" : current ? "bg-gold/50" : "bg-white/10")} />
            <span className={cn("flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.06em] sm:text-xs sm:tracking-[0.14em]", done || current ? "text-foreground" : "text-subtle")}>
              {done ? <Check className="size-3 text-gold" /> : null}
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function EventSummaryCard({ ctx }: { ctx: LeadContext }) {
  const ev = ctx.event;
  return (
    <dl className="grid gap-4 rounded-2xl border border-border bg-card p-5 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs text-muted-foreground">Event</dt>
        <dd className="mt-0.5 font-medium">{ev.eventType?.name ?? ev.title}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Date</dt>
        <dd className="mt-0.5 font-medium">{formatEventDate(ev.event_date)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Time</dt>
        <dd className="mt-0.5">
          {formatTimeRange(ev.start_time, ev.end_time)} · {formatDuration(ev.duration_minutes)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Service</dt>
        <dd className="mt-0.5">{serviceLabel(ctx)}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-xs text-muted-foreground">Venue</dt>
        <dd className="mt-0.5">{formatVenue(ev.venue)}</dd>
      </div>
    </dl>
  );
}

export function LinkExpired() {
  return (
    <div className="grid place-items-center py-16 text-center">
      <div className="grid size-16 place-items-center rounded-full border border-border bg-card">
        <LinkIcon className="size-6 text-gold" />
      </div>
      <h1 className="mt-6 font-display text-5xl">This link has expired</h1>
      <p className="mt-3 max-w-sm text-muted-foreground">For your security, booking links expire. Contact us and we&apos;ll send you a fresh one.</p>
      <Link href="/contact" className="mt-8 inline-flex h-11 items-center rounded-full bg-gold px-6 text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground">
        Contact us
      </Link>
    </div>
  );
}

export function PortalNav({ token, active }: { token: string; active: "portal" | "quote" | "contract" }) {
  const items = [
    { key: "portal", href: `/portal/${token}`, label: "Overview" },
    { key: "quote", href: `/quote/${token}`, label: "Quote" },
    { key: "contract", href: `/contract/${token}`, label: "Contract" },
  ] as const;
  return (
    <nav aria-label="Booking" className="mb-8 flex gap-1 rounded-full border border-border p-1">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={active === i.key ? "page" : undefined}
          className={cn("flex-1 rounded-full px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] transition", active === i.key ? "bg-white text-black" : "text-muted-foreground hover:text-foreground")}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
