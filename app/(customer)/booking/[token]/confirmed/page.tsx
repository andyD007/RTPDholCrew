import type { Metadata } from "next";
import Link from "next/link";
import { CalendarPlus, Download, MessageCircle } from "lucide-react";
import { createServiceClient } from "@/lib/database/server";
import { loadPortal } from "@/lib/portal/load";
import { getStripe, paymentsConfigured } from "@/lib/payments/stripe";
import { handleStripeEvent } from "@/lib/payments/service";
import { loadLeadContext, serviceLabel } from "@/lib/leads/context";
import { formatVenue } from "@/lib/contracts/render";
import { formatMoney } from "@/lib/money";
import { formatEventDate, formatTimeRange } from "@/lib/time";
import { LinkExpired } from "@/components/portal/shared";
import { ConfirmedTracker } from "@/components/portal/confirmed-tracker";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "You're booked!" };
export const dynamic = "force-dynamic";

/**
 * Stripe redirects here after checkout. The webhook is the source of truth,
 * but if it hasn't arrived yet we verify the session server-side with Stripe
 * (never trusting the query string) and reconcile through the same idempotent
 * handler, so the customer immediately sees the correct state.
 */
export default async function ConfirmedPage({ params, searchParams }: PageProps<"/booking/[token]/confirmed">) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  let portal = await loadPortal(token);
  if (!portal) return <LinkExpired />;

  const sessionId = typeof sp.session_id === "string" && /^cs_[A-Za-z0-9_]+$/.test(sp.session_id) ? sp.session_id : null;
  if (sessionId && paymentsConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.metadata?.leadId === portal.ctx.id && session.payment_status === "paid") {
        const db = createServiceClient();
        await handleStripeEvent(db, { id: `evt_redirect_${session.id}`, type: "checkout.session.completed", data: { object: session } } as never);
        const ctx = await loadLeadContext(db, portal.ctx.id);
        if (ctx) portal = { ...portal, ctx };
      }
    } catch (err) {
      console.error("[confirmed] session verification failed", err);
    }
  }

  const { ctx } = portal;
  const b = ctx.booking;
  const confirmed = b?.status === "confirmed" || b?.status === "completed";
  const lastPaid = b?.payments.filter((p) => p.status === "paid").at(-1);

  if (!confirmed) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-display text-5xl">Almost there…</h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">We&apos;re confirming your payment with Stripe. This usually takes a few seconds — refresh this page, or check your booking portal.</p>
        <Button asChild size="lg" className="mt-8">
          <Link href={`/portal/${token}`}>Go to your booking</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl text-center">
      <ConfirmedTracker valueCents={lastPaid?.amount_cents ?? 0} />
      <p className="eyebrow">Booking {b!.number}</p>
      <h1 className="mt-4 font-display text-6xl sm:text-8xl">
        You&apos;re booked <span aria-hidden>🎉</span>
      </h1>
      <p className="mx-auto mt-4 max-w-md text-lg text-foreground/80">Your date is reserved, {ctx.customer.first_name}. A confirmation email with your receipt is on its way.</p>

      <dl className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-border bg-border text-left sm:grid-cols-2">
        {[
          ["Date", formatEventDate(ctx.event.event_date)],
          ["Time", formatTimeRange(ctx.event.start_time, ctx.event.end_time)],
          ["Venue", formatVenue(ctx.event.venue)],
          ["Service", serviceLabel(ctx)],
          ["Deposit paid", formatMoney(Math.min(b!.amount_paid_cents, b!.deposit_cents), { showCents: true })],
          ["Remaining balance", formatMoney(Math.max(0, b!.total_cents - b!.amount_paid_cents), { showCents: true })],
        ].map(([label, value]) => (
          <div key={label} className="bg-card p-5">
            <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Button asChild size="lg">
          <a href={`/api/portal/${token}/calendar`}>
            <CalendarPlus /> Add to calendar
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href={`/portal/${token}#message`}>
            <MessageCircle /> Contact RTP Dhol Crew
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href={`/api/portal/${token}/contract`} target="_blank" rel="noreferrer">
            <Download /> Download contract
          </a>
        </Button>
        {lastPaid?.receipt_number ? (
          <Button asChild size="lg" variant="outline">
            <a href={`/api/portal/${token}/receipt/${lastPaid.id}`} target="_blank" rel="noreferrer">
              <Download /> Download receipt
            </a>
          </Button>
        ) : null}
      </div>
      <Link href={`/portal/${token}`} className="mt-8 inline-block text-sm text-gold underline-offset-4 hover:underline">
        Go to your booking portal →
      </Link>
    </div>
  );
}
