"use client";

import { useState } from "react";
import { Banknote, Download, RotateCcw } from "lucide-react";
import { recordOfflinePaymentAction, refundPaymentAction } from "@/actions/admin/sales";
import { useServerAction } from "@/hooks/use-action";
import type { LeadContext } from "@/lib/leads/context";
import { dollarsToCents, formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";

const TONE = { unpaid: "muted", pending: "warning", paid: "success", failed: "danger", refunded: "danger", partially_refunded: "warning" } as const;

export function PaymentsPanel({ ctx, isAdmin }: { ctx: LeadContext; isAdmin: boolean }) {
  const b = ctx.booking;
  return (
    <Panel title="Payments" action={b && isAdmin ? <RecordPayment leadId={ctx.id} remaining={b.total_cents - b.amount_paid_cents} depositDue={b.amount_paid_cents < b.deposit_cents} /> : null}>
      {!b ? (
        <p className="text-sm text-muted-foreground">Payments open once the customer accepts a quote and signs the contract.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Total", b.total_cents],
              ["Deposit", b.deposit_cents],
              ["Paid", b.amount_paid_cents],
              ["Balance", Math.max(0, b.total_cents - b.amount_paid_cents)],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(v as number, { showCents: true })}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Booking {b.number} · <Badge tone={b.status === "confirmed" ? "success" : b.status === "cancelled" ? "danger" : "muted"}>{b.status}</Badge>
          </p>
          <ul className="mt-4 grid gap-2">
            {b.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
                <span className="font-medium capitalize">{p.kind}</span>
                <Badge tone={TONE[p.status]}>{p.status.replace("_", " ")}</Badge>
                <span className="text-xs text-muted-foreground">{p.paid_at ? formatDateTime(p.paid_at) : formatDateTime(p.created_at)}</span>
                {p.stripe_payment_intent_id ? <span className="font-mono text-[11px] text-subtle">{p.stripe_payment_intent_id.slice(0, 18)}…</span> : p.status === "paid" ? <span className="text-[11px] text-subtle">offline</span> : null}
                <span className="ml-auto font-semibold tabular-nums">{formatMoney(p.amount_cents, { showCents: true })}</span>
                {p.refunded_cents ? <span className="text-xs text-destructive">−{formatMoney(p.refunded_cents, { showCents: true })}</span> : null}
                {p.receipt_number ? (
                  <a href={`/api/admin/payments/${p.id}/receipt`} target="_blank" rel="noreferrer" className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Download receipt">
                    <Download className="size-4" />
                  </a>
                ) : null}
                {isAdmin && p.stripe_payment_intent_id && ["paid", "partially_refunded"].includes(p.status) ? <RefundButton leadId={ctx.id} paymentId={p.id} max={p.amount_cents - p.refunded_cents} /> : null}
              </li>
            ))}
            {b.payments.length === 0 ? <li className="text-center text-xs text-muted-foreground">No payments yet.</li> : null}
          </ul>
        </>
      )}
    </Panel>
  );
}

function RecordPayment({ leadId, remaining, depositDue }: { leadId: string; remaining: number; depositDue: boolean }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"deposit" | "balance" | "other">(depositDue ? "deposit" : "balance");
  const [note, setNote] = useState("");
  const { run, pending } = useServerAction(recordOfflinePaymentAction, { success: "Payment recorded" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} disabled={remaining <= 0}>
        <Banknote /> Record payment
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record an offline payment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">For cash, check or Zelle. Remaining: {formatMoney(remaining, { showCents: true })}. Recording a deposit confirms the booking.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount ($)" htmlFor="op-amount">
            <Input id="op-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="150.00" className="h-10 rounded-lg" />
          </Field>
          <Field label="Type" htmlFor="op-kind">
            <NativeSelect id="op-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="h-10 rounded-lg">
              <option value="deposit">Deposit</option>
              <option value="balance">Balance</option>
              <option value="other">Other</option>
            </NativeSelect>
          </Field>
        </div>
        <Field label="Note" htmlFor="op-note">
          <Input id="op-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Zelle from Priya" className="h-10 rounded-lg" />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            loading={pending}
            onClick={async () => {
              let cents = 0;
              try {
                cents = dollarsToCents(amount);
              } catch {}
              const res = await run({ leadId, amountCents: cents, kind, note: note || null });
              if (res.ok) setOpen(false);
            }}
          >
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefundButton({ leadId, paymentId, max }: { leadId: string; paymentId: string; max: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((max / 100).toFixed(2));
  const { run, pending } = useServerAction(refundPaymentAction);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button onClick={() => setOpen(true)} className="rounded p-1 text-muted-foreground hover:text-destructive" aria-label="Refund">
        <RotateCcw className="size-4" />
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund payment</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Refunds are sent through Stripe to the original card. Maximum {formatMoney(max, { showCents: true })}. This can&apos;t be undone.</p>
        <Field label="Refund amount ($)" htmlFor="rf-amount">
          <Input id="rf-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 rounded-lg" />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" loading={pending} onClick={async () => { const r = await run({ paymentId, leadId, amountCents: Math.round(Number(amount) * 100) }); if (r.ok) setOpen(false); }}>
            Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
