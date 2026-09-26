import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarPlus, Download, FileSignature, FileText, PartyPopper } from "lucide-react";
import { createServiceClient } from "@/lib/database/server";
import { customerQuote, loadPortal, portalStage } from "@/lib/portal/load";
import { amountDue } from "@/lib/payments/service";
import { paymentsConfigured } from "@/lib/payments/stripe";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/time";
import { EventSummaryCard, LinkExpired, PortalNav, StageTracker } from "@/components/portal/shared";
import { PayButton } from "@/components/portal/pay-button";
import { PortalDetailsForm, PortalMessageForm, PortalUploadForm } from "@/components/portal/portal-forms";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Your booking" };
export const dynamic = "force-dynamic";

const NEXT_STEP: Record<string, { title: string; body: string }> = {
  request: { title: "We're reviewing your request", body: "We're checking the schedule and preparing your quote — usually within one business day." },
  quote: { title: "Your quote is ready", body: "Review your quote and accept it online. Questions? Ask right from the quote page." },
  contract: { title: "Sign your agreement", body: "Review and e-sign your performance agreement to move forward." },
  deposit: { title: "Pay your deposit", body: "Your agreement is signed. The deposit reserves your date." },
  booked: { title: "You're booked!", body: "Your date is reserved. Add details below — entrance cues, parking, songs — so we can plan the perfect moment." },
  complete: { title: "Thank you for having us!", body: "It was an honor to be part of your celebration." },
  closed: { title: "This request is closed", body: "If plans change, we'd love to hear from you again." },
};

export default async function PortalPage({ params, searchParams }: PageProps<"/portal/[token]">) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const portal = await loadPortal(token);
  if (!portal) return <LinkExpired />;
  const { ctx } = portal;
  const stage = portalStage(ctx);
  const quote = customerQuote(ctx);
  const due = amountDue(ctx);
  const next = NEXT_STEP[stage];
  const { data: messages } = await createServiceClient()
    .from("messages")
    .select("id, direction, subject, body, created_at, sent_at, type")
    .eq("lead_id", ctx.id)
    .in("type", ["email", "sms"])
    .in("status", ["sent", "delivered", "logged"])
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <>
      <PortalNav token={token} active="portal" />
      {sp.payment === "cancelled" ? <p className="mb-6 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">Payment was cancelled — nothing was charged. You can try again anytime.</p> : null}

      <p className="eyebrow">Booking {ctx.booking?.number ?? ctx.reference}</p>
      <h1 className="mt-3 font-display text-5xl sm:text-6xl">Hi {ctx.customer.first_name}!</h1>
      <div className="mt-8">
        <StageTracker stage={stage} />
      </div>

      <section className="mt-8 rounded-2xl border border-gold/40 bg-gold/[0.05] p-6">
        <div className="flex items-start gap-4">
          {stage === "booked" ? <PartyPopper className="size-7 shrink-0 text-gold" /> : null}
          <div className="flex-1">
            <h2 className="text-xl font-semibold">{next.title}</h2>
            <p className="mt-1 text-sm text-foreground/80">{next.body}</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {stage === "quote" && quote ? (
                <Button asChild size="lg">
                  <Link href={`/quote/${token}`}>
                    <FileText /> View quote <ArrowRight />
                  </Link>
                </Button>
              ) : null}
              {stage === "contract" ? (
                <Button asChild size="lg">
                  <Link href={`/contract/${token}`}>
                    <FileSignature /> Review & sign <ArrowRight />
                  </Link>
                </Button>
              ) : null}
              {stage === "booked" ? (
                <Button asChild size="lg" variant="outline">
                  <a href={`/api/portal/${token}/calendar`}>
                    <CalendarPlus /> Add to calendar
                  </a>
                </Button>
              ) : null}
            </div>
            {due ? <PayButton token={token} kind={due.kind} amountCents={due.amountCents} configured={paymentsConfigured()} className="mt-5 max-w-md" /> : null}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Event</h2>
        <EventSummaryCard ctx={ctx} />
      </section>

      {ctx.booking ? (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Payments</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Total", ctx.booking.total_cents],
              ["Paid", ctx.booking.amount_paid_cents],
              ["Balance", Math.max(0, ctx.booking.total_cents - ctx.booking.amount_paid_cents)],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums sm:text-2xl">{formatMoney(v as number, { showCents: true })}</p>
              </div>
            ))}
          </div>
          {ctx.booking.payments.filter((p) => p.status === "paid" || p.status.includes("refund")).length ? (
            <ul className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card">
              {ctx.booking.payments
                .filter((p) => p.receipt_number)
                .map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="capitalize">
                      {p.kind} · {p.paid_at ? formatDateTime(p.paid_at) : ""}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{formatMoney(p.amount_cents, { showCents: true })}</span>
                      <a href={`/api/portal/${token}/receipt/${p.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-gold hover:underline">
                        <Download className="size-3.5" /> Receipt
                      </a>
                    </span>
                  </li>
                ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {stage !== "closed" ? (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">Event details</h2>
            <p className="mt-1 text-xs text-muted-foreground">Help us plan the moment. You can update these anytime.</p>
            <PortalDetailsForm
              token={token}
              initial={{
                phone: ctx.customer.phone ?? "",
                plannerName: ctx.event.planner_name ?? "",
                plannerEmail: ctx.event.planner_email ?? "",
                plannerPhone: ctx.event.planner_phone ?? "",
                entranceInstructions: ctx.event.entrance_instructions ?? "",
                specialSongs: ctx.event.special_songs ?? "",
                parkingNotes: ctx.event.venue?.parking_notes ?? "",
              }}
            />
          </div>
          <div className="grid content-start gap-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold">Documents</h2>
              <p className="mt-1 text-xs text-muted-foreground">Share an itinerary or venue instructions (PDF, Word or image, up to 10 MB).</p>
              <PortalUploadForm token={token} hasItinerary={Boolean(ctx.event.itinerary_path)} hasVenue={Boolean(ctx.event.venue_instructions_path)} />
              {ctx.liveContract ? (
                <a href={`/api/portal/${token}/contract`} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-2 text-sm text-gold hover:underline">
                  <Download className="size-4" /> Contract {ctx.liveContract.number} <Badge tone={ctx.liveContract.status === "signed" ? "success" : "muted"}>{ctx.liveContract.status}</Badge>
                </a>
              ) : null}
            </div>
            <div id="message" className="scroll-mt-20 rounded-2xl border border-border bg-card p-5">
              <h2 className="text-base font-semibold">Message us</h2>
              <PortalMessageForm token={token} />
              {messages?.length ? (
                <ul className="mt-4 grid max-h-72 gap-2 overflow-y-auto">
                  {messages.map((m) => (
                    <li key={m.id} className={`rounded-xl p-3 text-sm ${m.direction === "inbound" ? "ml-6 bg-gold/10" : "mr-6 bg-white/[0.04]"}`}>
                      <p className="text-[11px] text-muted-foreground">
                        {m.direction === "inbound" ? "You" : "RTP Dhol Crew"} · {formatDateTime(m.sent_at ?? m.created_at)}
                      </p>
                      {m.subject ? <p className="mt-1 font-medium">{m.subject}</p> : null}
                      <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-foreground/80">{m.body}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
