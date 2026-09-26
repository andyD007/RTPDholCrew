import type { Metadata } from "next";
import { loadPortal, customerQuote } from "@/lib/portal/load";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/time";
import { EventSummaryCard, LinkExpired, PortalNav } from "@/components/portal/shared";
import { QuoteActions } from "@/components/portal/quote-actions";
import { ViewTracker } from "@/components/portal/view-tracker";
import { Badge } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Your quote" };
export const dynamic = "force-dynamic";

export default async function CustomerQuotePage({ params }: PageProps<"/quote/[token]">) {
  const { token } = await params;
  const portal = await loadPortal(token);
  if (!portal) return <LinkExpired />;
  const { ctx } = portal;
  const quote = customerQuote(ctx);

  return (
    <>
      <PortalNav token={token} active="quote" />
      {!quote ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="font-display text-4xl">Your quote is on its way</h1>
          <p className="mt-3 text-muted-foreground">We&apos;re reviewing your request and will send your quote shortly.</p>
        </div>
      ) : (
        <>
          {quote.status === "sent" ? <ViewTracker token={token} kind="quote" id={quote.id} /> : null}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Quote {quote.number}</p>
              <h1 className="mt-3 font-display text-5xl sm:text-6xl">{ctx.customer.first_name}, here&apos;s your quote</h1>
            </div>
            <Badge tone={quote.status === "accepted" ? "success" : "gold"}>{quote.status === "accepted" ? "Accepted" : quote.expires_on ? `Valid until ${formatShortDate(quote.expires_on)}` : "Open"}</Badge>
          </div>
          <EventSummaryCard ctx={ctx} />
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <table className="w-full text-sm">
              <caption className="sr-only">Quote line items</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="pb-3 font-semibold">Item</th>
                  <th className="pb-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((i) => (
                  <tr key={i.id} className="border-b border-border">
                    <td className="py-3">
                      {i.description}
                      {Number(i.quantity) !== 1 ? <span className="text-muted-foreground"> × {Number(i.quantity)}</span> : null}
                    </td>
                    <td className="py-3 text-right tabular-nums">{formatMoney(i.total_cents, { showCents: true })}</td>
                  </tr>
                ))}
                {quote.travel_fee_cents ? (
                  <tr className="border-b border-border">
                    <td className="py-3">Travel</td>
                    <td className="py-3 text-right tabular-nums">{formatMoney(quote.travel_fee_cents, { showCents: true })}</td>
                  </tr>
                ) : null}
                {quote.additional_fee_cents ? (
                  <tr className="border-b border-border">
                    <td className="py-3">Additional</td>
                    <td className="py-3 text-right tabular-nums">{formatMoney(quote.additional_fee_cents, { showCents: true })}</td>
                  </tr>
                ) : null}
                {quote.discount_cents ? (
                  <tr className="border-b border-border text-success">
                    <td className="py-3">Discount</td>
                    <td className="py-3 text-right tabular-nums">−{formatMoney(quote.discount_cents, { showCents: true })}</td>
                  </tr>
                ) : null}
                {quote.tax_cents ? (
                  <tr className="border-b border-border">
                    <td className="py-3">Tax ({(quote.tax_rate_bps / 100).toFixed(2)}%)</td>
                    <td className="py-3 text-right tabular-nums">{formatMoney(quote.tax_cents, { showCents: true })}</td>
                  </tr>
                ) : null}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-4 text-base font-semibold">Total</td>
                  <td className="pt-4 text-right text-2xl font-semibold tabular-nums text-gold">{formatMoney(quote.total_cents, { showCents: true })}</td>
                </tr>
                <tr>
                  <td className="pt-2 text-muted-foreground">Deposit to reserve your date</td>
                  <td className="pt-2 text-right tabular-nums">{formatMoney(quote.deposit_cents, { showCents: true })}</td>
                </tr>
                <tr>
                  <td className="pt-1 text-muted-foreground">Remaining balance (due by event day)</td>
                  <td className="pt-1 text-right tabular-nums">{formatMoney(quote.balance_cents, { showCents: true })}</td>
                </tr>
              </tfoot>
            </table>
            {quote.notes ? <p className="mt-6 whitespace-pre-wrap rounded-xl bg-white/[0.03] p-4 text-sm text-foreground/85">{quote.notes}</p> : null}
            <p className="mt-4 text-xs text-muted-foreground">Performance: {quote.performance_minutes} minutes · {quote.performers} {quote.performers === 1 ? "player" : "players"}</p>
          </div>
          <QuoteActions token={token} quoteId={quote.id} status={quote.status} />
        </>
      )}
    </>
  );
}
