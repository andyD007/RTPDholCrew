import Link from "next/link";
import type { LeadListItem } from "@/lib/leads/queries";
import { formatMoney } from "@/lib/money";
import { formatShortDate, formatTime12 } from "@/lib/time";
import { formatPhone } from "@/lib/utils";
import { AvailabilityBadge, LeadStatusBadge } from "@/components/admin/ui";
import { EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/misc";
import { Users } from "lucide-react";

export function LeadTable({ leads }: { leads: LeadListItem[] }) {
  if (!leads.length) return <EmptyState icon={<Users />} title="No leads match these filters" description="Try clearing a filter or searching for something else." />;
  return (
    <div className="rounded-2xl border border-border bg-card">
      <Table>
        <THead>
          <TR>
            <TH>Event</TH>
            <TH>Date</TH>
            <TH>Customer</TH>
            <TH className="hidden md:table-cell">Venue</TH>
            <TH className="hidden lg:table-cell">Service</TH>
            <TH>Status</TH>
            <TH className="hidden xl:table-cell">Availability</TH>
            <TH className="text-right">Value</TH>
          </TR>
        </THead>
        <TBody>
          {leads.map((l) => (
            <TR key={l.id}>
              <TD>
                <Link href={`/admin/leads/${l.id}`} className="font-medium hover:text-gold">
                  {l.eventTitle}
                </Link>
                <p className="font-mono text-[11px] text-subtle">{l.reference}</p>
              </TD>
              <TD className="whitespace-nowrap">
                {formatShortDate(l.eventDate)}
                <p className="text-xs text-muted-foreground">{formatTime12(l.startTime)}</p>
              </TD>
              <TD>
                {l.customer}
                <p className="text-xs text-muted-foreground">{formatPhone(l.phone) || l.email}</p>
              </TD>
              <TD className="hidden md:table-cell">
                {l.venue}
                <p className="text-xs text-muted-foreground">{l.city}</p>
              </TD>
              <TD className="hidden lg:table-cell">{l.service ?? "Custom"}</TD>
              <TD>
                <LeadStatusBadge status={l.status} />
              </TD>
              <TD className="hidden xl:table-cell">
                <AvailabilityBadge status={l.availability} />
              </TD>
              <TD className="text-right tabular-nums">
                {l.valueCents ? formatMoney(l.valueCents) : "—"}
                {l.balanceCents ? <p className="text-xs text-warning">{formatMoney(l.balanceCents)} due</p> : null}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
