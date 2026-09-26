import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { requireStaff } from "@/lib/auth/admin";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatShortDate } from "@/lib/time";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Badge, EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Quotes & contracts" };
export const dynamic = "force-dynamic";

const QUOTE_TONE = { draft: "muted", sent: "info", viewed: "gold", accepted: "success", declined: "danger", expired: "warning", superseded: "muted" } as const;
const CONTRACT_TONE = { draft: "muted", sent: "info", viewed: "gold", signed: "success", void: "danger" } as const;

export default async function QuotesPage() {
  const { db } = await requireStaff();
  const [{ data: quotes }, { data: contracts }] = await Promise.all([
    db.from("quotes").select("id, number, status, total_cents, deposit_cents, sent_at, viewed_at, expires_on, lead_id, leads(reference, events(title, event_date))").neq("status", "superseded").order("created_at", { ascending: false }).limit(200),
    db.from("contracts").select("id, number, status, sent_at, signed_at, lead_id, leads(events(title, event_date)), contract_signatures(signer_name)").neq("status", "void").order("created_at", { ascending: false }).limit(200),
  ]);
  return (
    <>
      <PageHeader title="Quotes & contracts" description="Every quote and agreement, newest first." />
      <div className="grid gap-6">
        <Panel title={`Quotes (${quotes?.length ?? 0})`}>
          {!quotes?.length ? (
            <EmptyState icon={<FileText />} title="No quotes yet" description="Build a quote from any lead." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Quote</TH>
                  <TH>Event</TH>
                  <TH>Status</TH>
                  <TH className="hidden md:table-cell">Sent</TH>
                  <TH className="hidden md:table-cell">Expires</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {quotes.map((q) => (
                  <TR key={q.id}>
                    <TD className="font-mono text-xs">
                      <Link href={`/admin/leads/${q.lead_id}`} className="hover:text-gold">
                        {q.number}
                      </Link>
                    </TD>
                    <TD>
                      {q.leads?.events?.title}
                      <p className="text-xs text-muted-foreground">{q.leads?.events ? formatShortDate(q.leads.events.event_date) : ""}</p>
                    </TD>
                    <TD>
                      <Badge tone={QUOTE_TONE[q.status]}>{q.status}</Badge>
                    </TD>
                    <TD className="hidden text-xs text-muted-foreground md:table-cell">{q.sent_at ? formatDateTime(q.sent_at) : "—"}</TD>
                    <TD className="hidden text-xs text-muted-foreground md:table-cell">{q.expires_on ? formatShortDate(q.expires_on) : "—"}</TD>
                    <TD className="text-right tabular-nums">{formatMoney(q.total_cents)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
        <Panel title={`Contracts (${contracts?.length ?? 0})`}>
          {!contracts?.length ? (
            <p className="text-sm text-muted-foreground">Contracts are generated when customers accept quotes.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Contract</TH>
                  <TH>Event</TH>
                  <TH>Status</TH>
                  <TH className="hidden md:table-cell">Signed</TH>
                  <TH className="text-right">PDF</TH>
                </TR>
              </THead>
              <TBody>
                {contracts.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-mono text-xs">
                      <Link href={`/admin/leads/${c.lead_id}`} className="hover:text-gold">
                        {c.number}
                      </Link>
                    </TD>
                    <TD>{c.leads?.events?.title}</TD>
                    <TD>
                      <Badge tone={CONTRACT_TONE[c.status]}>{c.status}</Badge>
                    </TD>
                    <TD className="hidden text-xs text-muted-foreground md:table-cell">{c.signed_at ? `${c.contract_signatures?.signer_name ?? ""} · ${formatDateTime(c.signed_at)}` : c.sent_at ? `Sent ${formatDateTime(c.sent_at)}` : "—"}</TD>
                    <TD className="text-right">
                      <a href={`/api/admin/contracts/${c.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs text-gold hover:underline">
                        Download
                      </a>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
      </div>
    </>
  );
}
