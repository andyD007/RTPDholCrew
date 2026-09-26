import type { Metadata } from "next";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { requireStaff } from "@/lib/auth/admin";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatShortDate } from "@/lib/time";
import { PageHeader, Panel, StatCard } from "@/components/admin/ui";
import { Badge, EmptyState, Table, TBody, TD, TH, THead, TR } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

const TONE = { unpaid: "muted", pending: "warning", paid: "success", failed: "danger", refunded: "danger", partially_refunded: "warning" } as const;

export default async function PaymentsPage() {
  const { db } = await requireStaff();
  const [{ data: payments }, { data: balances }] = await Promise.all([
    db.from("payments").select("*, bookings(number, lead_id, leads(events(title)))").order("created_at", { ascending: false }).limit(200),
    db.from("bookings").select("id, number, lead_id, total_cents, amount_paid_cents, status, leads(events!inner(title, event_date))").in("status", ["confirmed", "completed", "pending"]).order("created_at", { ascending: false }),
  ]);
  const paid = (payments ?? []).filter((p) => p.status === "paid" || p.status === "partially_refunded");
  const collected = paid.reduce((s, p) => s + p.amount_cents - p.refunded_cents, 0);
  const outstanding = (balances ?? []).filter((b) => b.status !== "pending" && b.total_cents > b.amount_paid_cents);
  const outstandingCents = outstanding.reduce((s, b) => s + b.total_cents - b.amount_paid_cents, 0);

  return (
    <>
      <PageHeader title="Payments" description="Stripe and offline payments. Card details are never stored — only Stripe references." />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Collected (all time)" value={formatMoney(collected)} tone="success" />
        <StatCard label="Outstanding balances" value={formatMoney(outstandingCents)} tone={outstandingCents ? "warning" : undefined} />
        <StatCard label="Payments" value={paid.length} />
        <StatCard label="Failed / expired" value={(payments ?? []).filter((p) => p.status === "failed").length} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Payment history" className="xl:col-span-2">
          {!payments?.length ? (
            <EmptyState icon={<Wallet />} title="No payments yet" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>
                  <TH>Booking</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Receipt</TH>
                </TR>
              </THead>
              <TBody>
                {payments.map((p) => (
                  <TR key={p.id}>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(p.paid_at ?? p.created_at)}</TD>
                    <TD>
                      <Link href={`/admin/leads/${p.bookings?.lead_id}`} className="hover:text-gold">
                        {p.bookings?.leads?.events?.title}
                      </Link>
                      <p className="font-mono text-[11px] text-subtle">{p.bookings?.number}</p>
                    </TD>
                    <TD className="capitalize">{p.kind}</TD>
                    <TD>
                      <Badge tone={TONE[p.status]}>{p.status.replace("_", " ")}</Badge>
                    </TD>
                    <TD className="text-right tabular-nums">
                      {formatMoney(p.amount_cents, { showCents: true })}
                      {p.refunded_cents ? <p className="text-xs text-destructive">−{formatMoney(p.refunded_cents, { showCents: true })}</p> : null}
                    </TD>
                    <TD className="text-right">
                      {p.receipt_number ? (
                        <a href={`/api/admin/payments/${p.id}/receipt`} target="_blank" rel="noreferrer" className="font-mono text-xs text-gold hover:underline">
                          {p.receipt_number}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
        <Panel title="Remaining balances">
          {!outstanding.length ? (
            <p className="text-sm text-muted-foreground">All confirmed bookings are paid in full.</p>
          ) : (
            <ul className="divide-y divide-border">
              {outstanding.map((b) => (
                <li key={b.id}>
                  <Link href={`/admin/leads/${b.lead_id}`} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{b.leads?.events.title}</span>
                      <span className="text-xs text-muted-foreground">{b.leads ? formatShortDate(b.leads.events.event_date) : ""}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-warning">{formatMoney(b.total_cents - b.amount_paid_cents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
