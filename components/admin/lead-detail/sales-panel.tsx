"use client";

import Link from "next/link";
import { useState } from "react";
import { Ban, Download, FileSignature, FileText, Pencil, Send } from "lucide-react";
import { editContractAction, sendContractAction, sendQuoteAction, voidContractAction } from "@/actions/admin/sales";
import { useServerAction } from "@/hooks/use-action";
import type { LeadContext } from "@/lib/leads/context";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatShortDate } from "@/lib/time";
import { Panel } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/form-controls";

const QUOTE_TONE = { draft: "muted", sent: "info", viewed: "gold", accepted: "success", declined: "danger", expired: "warning", superseded: "muted" } as const;
const CONTRACT_TONE = { draft: "muted", sent: "info", viewed: "gold", signed: "success", void: "danger" } as const;

export function SalesPanel({ ctx, isAdmin }: { ctx: LeadContext; isAdmin: boolean }) {
  const sendQuote = useServerAction(sendQuoteAction, { success: (d) => (d.delivery === "logged" ? "Quote marked sent (email logged — provider not configured)" : "Quote sent") });
  const sendContract = useServerAction(sendContractAction, { success: "Contract sent" });
  const contract = ctx.liveContract;
  const accepted = ctx.quotes.find((q) => q.status === "accepted");

  return (
    <Panel
      title="Quote & contract"
      action={
        <Button asChild size="sm" variant="ghost">
          <Link href={`/admin/leads/${ctx.id}/quote`}>New quote</Link>
        </Button>
      }
    >
      {ctx.quotes.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No quote yet"
          description="Use the quote builder — the quote assistant will suggest pricing from your rules."
          action={
            <Button asChild size="sm">
              <Link href={`/admin/leads/${ctx.id}/quote`}>Build quote</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {ctx.quotes.map((q) => (
            <li key={q.id} className={`rounded-xl border p-4 ${q.status === "superseded" ? "border-border opacity-60" : "border-border-strong"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{q.number}</span>
                  <Badge tone={QUOTE_TONE[q.status]}>{q.status}</Badge>
                </div>
                <span className="text-lg font-semibold tabular-nums">{formatMoney(q.total_cents, { showCents: true })}</span>
              </div>
              <ul className="mt-3 grid gap-1 text-sm text-foreground/80">
                {q.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-4">
                    <span>
                      {i.description}
                      {Number(i.quantity) !== 1 ? ` × ${Number(i.quantity)}` : ""}
                    </span>
                    <span className="tabular-nums">{formatMoney(i.total_cents)}</span>
                  </li>
                ))}
                {q.travel_fee_cents ? <li className="flex justify-between"><span>Travel</span><span>{formatMoney(q.travel_fee_cents)}</span></li> : null}
                {q.additional_fee_cents ? <li className="flex justify-between"><span>Additional fee</span><span>{formatMoney(q.additional_fee_cents)}</span></li> : null}
                {q.discount_cents ? <li className="flex justify-between text-success"><span>Discount</span><span>−{formatMoney(q.discount_cents)}</span></li> : null}
                {q.tax_cents ? <li className="flex justify-between"><span>Tax</span><span>{formatMoney(q.tax_cents, { showCents: true })}</span></li> : null}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">
                Deposit {formatMoney(q.deposit_cents)} · Balance {formatMoney(q.balance_cents)}
                {q.expires_on ? ` · Expires ${formatShortDate(q.expires_on)}` : ""}
                {q.sent_at ? ` · Sent ${formatDateTime(q.sent_at)}` : ""}
                {q.viewed_at ? ` · Viewed ${formatDateTime(q.viewed_at)}` : ""}
              </p>
              {q.customer_question ? <p className="mt-2 rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">Customer asked: “{q.customer_question}”</p> : null}
              {q.decline_reason ? <p className="mt-2 text-sm text-destructive">Declined: {q.decline_reason}</p> : null}
              {["draft", "sent", "viewed"].includes(q.status) ? (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" loading={sendQuote.pending} onClick={() => sendQuote.run({ quoteId: q.id, leadId: ctx.id })}>
                    <Send /> {q.status === "draft" ? "Send quote" : "Resend"}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileSignature className="size-4 text-gold" /> Contract
            {contract ? (
              <>
                <span className="font-mono text-xs text-muted-foreground">{contract.number}</span>
                <Badge tone={CONTRACT_TONE[contract.status]}>{contract.status}</Badge>
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {contract ? (
              <Button asChild size="sm" variant="outline">
                <a href={`/api/admin/contracts/${contract.id}/pdf`} target="_blank" rel="noreferrer">
                  <Download /> PDF
                </a>
              </Button>
            ) : null}
            {(contract && contract.status !== "signed") || (!contract && accepted) ? (
              <Button size="sm" loading={sendContract.pending} onClick={() => sendContract.run({ leadId: ctx.id })}>
                <Send /> {contract ? "Resend" : "Generate & send"}
              </Button>
            ) : null}
            {contract && isAdmin && contract.status !== "signed" ? <EditContract leadId={ctx.id} contractId={contract.id} body={contract.body} /> : null}
            {contract && isAdmin ? <VoidContract leadId={ctx.id} contractId={contract.id} signed={contract.status === "signed"} /> : null}
          </div>
        </div>
        {contract?.signature ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Signed by <span className="text-foreground">{contract.signature.signer_name}</span> on {formatDateTime(contract.signature.signed_at)}
            {contract.signature.ip_address ? ` · IP ${contract.signature.ip_address}` : ""} · v{contract.signature.contract_version}
          </p>
        ) : contract ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {contract.sent_at ? `Sent ${formatDateTime(contract.sent_at)}` : "Not sent"}
            {contract.viewed_at ? ` · Viewed ${formatDateTime(contract.viewed_at)}` : ""}
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">A contract is generated automatically when the customer accepts a quote.</p>
        )}
      </div>
    </Panel>
  );
}

function EditContract({ leadId, contractId, body }: { leadId: string; contractId: string; body: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(body);
  const { run, pending } = useServerAction(editContractAction, { success: "Contract updated" });
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setText(body); }}>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Pencil /> Edit text
      </Button>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit contract text</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">Plain text. Lines starting with “## ” become headings. The customer signs exactly this text; edits are audit-logged.</p>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={20} className="font-mono text-xs" />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button loading={pending} onClick={async () => { const r = await run({ contractId, leadId, body: text }); if (r.ok) setOpen(false); }}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VoidContract({ leadId, contractId, signed }: { leadId: string; contractId: string; signed: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { run, pending } = useServerAction(voidContractAction, { success: "Contract voided" });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setOpen(true)}>
        <Ban /> Void
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void this contract?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{signed ? "This contract is SIGNED. Voiding it is a legal matter — only do this if both parties agreed." : "The customer will no longer be able to sign it."} This is audit-logged.</p>
        <Textarea placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" loading={pending} disabled={reason.trim().length < 3} onClick={async () => { const r = await run({ contractId, leadId, reason }); if (r.ok) setOpen(false); }}>
            Void contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
