import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import type { LeadListItem } from "@/lib/leads/queries";
import { formatMoney } from "@/lib/money";
import { formatShortDate, formatTime12 } from "@/lib/time";
import { cn } from "@/lib/utils";
import { AvailabilityBadge } from "@/components/admin/ui";

export function LeadCardBody({ lead, dragging }: { lead: LeadListItem; dragging?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-3 text-left shadow-sm transition", dragging ? "rotate-1 border-gold/60 shadow-2xl" : "hover:border-border-strong")}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/admin/leads/${lead.id}`} className="min-w-0 text-sm font-semibold leading-snug hover:text-gold" onPointerDown={(e) => e.stopPropagation()}>
          {lead.eventTitle}
        </Link>
        {lead.urgency === "urgent" ? <span className="mt-1 size-2 shrink-0 rounded-full bg-destructive" title="Urgent" /> : lead.urgency === "high" ? <span className="mt-1 size-2 shrink-0 rounded-full bg-warning" title="High urgency" /> : null}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.customer}</p>
      <div className="mt-2.5 grid gap-1 text-xs text-foreground/75">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-subtle" /> {formatShortDate(lead.eventDate)} · {formatTime12(lead.startTime)}
        </span>
        {lead.city ? (
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3.5 text-subtle" /> {lead.city}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <AvailabilityBadge status={lead.availability} />
        {lead.valueCents ? <span className="text-xs font-semibold tabular-nums">{formatMoney(lead.valueCents)}</span> : null}
      </div>
    </div>
  );
}
