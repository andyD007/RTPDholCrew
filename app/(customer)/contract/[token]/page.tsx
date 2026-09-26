import type { Metadata } from "next";
import { Download } from "lucide-react";
import { loadPortal } from "@/lib/portal/load";
import { toBlocks } from "@/lib/contracts/render";
import { formatDateTime } from "@/lib/time";
import { amountDue } from "@/lib/payments/service";
import { paymentsConfigured } from "@/lib/payments/stripe";
import { LinkExpired, PortalNav } from "@/components/portal/shared";
import { SignContractForm } from "@/components/portal/sign-form";
import { PayButton } from "@/components/portal/pay-button";
import { ViewTracker } from "@/components/portal/view-tracker";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Your agreement" };
export const dynamic = "force-dynamic";

export default async function CustomerContractPage({ params }: PageProps<"/contract/[token]">) {
  const { token } = await params;
  const portal = await loadPortal(token);
  if (!portal) return <LinkExpired />;
  const { ctx } = portal;
  const contract = ctx.liveContract;
  const due = amountDue(ctx);

  return (
    <>
      <PortalNav token={token} active="contract" />
      {!contract ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-4xl">No agreement yet</h1>
          <p className="mt-3 text-muted-foreground">Your agreement is created as soon as you accept your quote.</p>
        </div>
      ) : (
        <>
          {contract.status === "sent" ? <ViewTracker token={token} kind="contract" id={contract.id} /> : null}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Contract {contract.number}</p>
              <h1 className="mt-3 font-display text-5xl sm:text-6xl">Performance agreement</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={contract.status === "signed" ? "success" : "gold"}>{contract.status === "signed" ? "Signed" : "Awaiting signature"}</Badge>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/portal/${token}/contract`} target="_blank" rel="noreferrer">
                  <Download /> PDF
                </a>
              </Button>
            </div>
          </div>

          <article className="max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed sm:p-8" tabIndex={0} aria-label="Contract text">
            {toBlocks(contract.body).map((b, i) =>
              b.type === "heading" ? (
                <h2 key={i} className={i === 0 ? "mb-4 text-xl font-semibold" : "mb-2 mt-6 text-base font-semibold text-gold"}>
                  {b.text}
                </h2>
              ) : (
                <p key={i} className="mb-3 whitespace-pre-wrap text-foreground/85">
                  {b.text}
                </p>
              ),
            )}
          </article>

          {contract.status === "signed" ? (
            <div className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-6">
              <p className="font-semibold">
                Signed by {contract.signature?.signer_name} · {contract.signature ? formatDateTime(contract.signature.signed_at) : ""}
              </p>
              {due?.kind === "deposit" ? (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">Last step: pay your deposit to reserve the date.</p>
                  <PayButton token={token} kind="deposit" amountCents={due.amountCents} configured={paymentsConfigured()} className="mt-4" />
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Your deposit is received — you&apos;re booked.</p>
              )}
            </div>
          ) : contract.status === "void" ? null : (
            <SignContractForm token={token} contractId={contract.id} contentHash={contract.content_hash} customerName={`${ctx.customer.first_name} ${ctx.customer.last_name}`} />
          )}
        </>
      )}
    </>
  );
}
