import "server-only";
import type Stripe from "stripe";
import { createServiceClient, type TypedSupabaseClient } from "@/lib/database/server";
import { emitDomainEvent } from "@/lib/automation/events";
import { loadLeadContext, type LeadContext } from "@/lib/leads/context";
import { audit } from "@/lib/security/audit";
import { customerLinks } from "@/lib/portal/access";
import { env } from "@/lib/env";
import { formatEventDate } from "@/lib/time";
import { getStripe } from "./stripe";

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

/** What the customer can pay right now, if anything. */
export function amountDue(ctx: LeadContext): { kind: "deposit" | "balance"; amountCents: number } | null {
  const b = ctx.booking;
  if (!b || b.status === "cancelled") return null;
  if (ctx.liveContract?.status !== "signed") return null;
  const paid = b.amount_paid_cents;
  if (paid < b.deposit_cents) return { kind: "deposit", amountCents: b.deposit_cents - paid };
  if (paid < b.total_cents) return { kind: "balance", amountCents: b.total_cents - paid };
  return null;
}

/**
 * Create a Stripe Checkout Session (cards, Apple Pay and Google Pay are
 * offered automatically by Checkout where supported). A `payments` row is
 * created first so the webhook can reconcile by our own ID.
 */
export async function createCheckout(leadId: string, token: string, requested: "deposit" | "balance") {
  const db = createServiceClient();
  const ctx = await loadLeadContext(db, leadId);
  if (!ctx) throw new PaymentError("Booking not found");
  const due = amountDue(ctx);
  if (!due) throw new PaymentError("There is nothing to pay right now.");
  if (requested !== due.kind) throw new PaymentError(due.kind === "deposit" ? "Please pay the deposit first." : "The deposit has already been paid.");

  // Reuse an open checkout for the same amount instead of creating duplicates.
  const { data: open } = await db
    .from("payments")
    .select("id, stripe_checkout_session_id, amount_cents")
    .eq("booking_id", ctx.booking!.id)
    .eq("status", "pending")
    .eq("kind", due.kind)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const stripe = getStripe();
  if (open?.stripe_checkout_session_id && open.amount_cents === due.amountCents) {
    const existing = await stripe.checkout.sessions.retrieve(open.stripe_checkout_session_id);
    if (existing.status === "open" && existing.url) return { url: existing.url };
  }

  const { data: payment, error } = await db
    .from("payments")
    .insert({ booking_id: ctx.booking!.id, kind: due.kind, status: "pending", amount_cents: due.amountCents })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to start payment: ${error.message}`);

  const links = customerLinks(token);
  const label = due.kind === "deposit" ? "Booking deposit" : "Remaining balance";
  const metadata = { paymentId: payment.id, leadId: ctx.id, bookingId: ctx.booking!.id, kind: due.kind };
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: ctx.customer.email,
      client_reference_id: payment.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: due.amountCents,
            product_data: {
              name: `${label} — ${ctx.event.title}`,
              description: `${formatEventDate(ctx.event.event_date)} · Booking ${ctx.booking!.number}`,
            },
          },
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
        receipt_email: ctx.customer.email,
        ...(env().STRIPE_STATEMENT_DESCRIPTOR_SUFFIX ? { statement_descriptor_suffix: env().STRIPE_STATEMENT_DESCRIPTOR_SUFFIX!.slice(0, 22) } : {}),
      },
      success_url: `${links.confirmation}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${links.portal}?payment=cancelled`,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 2,
    },
    { idempotencyKey: `checkout-${payment.id}` },
  );
  await db.from("payments").update({ stripe_checkout_session_id: session.id }).eq("id", payment.id);
  if (due.kind === "deposit") await db.from("leads").update({ status: "deposit_pending" }).eq("id", ctx.id).eq("status", "contract_signed");
  if (!session.url) throw new PaymentError("Stripe did not return a checkout URL");
  return { url: session.url };
}

/**
 * Mark a payment as paid and apply it to the booking. Idempotent: a payment
 * already marked paid is a no-op, so webhook retries and offline recordings
 * can't double-count. Deposit coverage confirms the booking.
 */
export async function applyPaidPayment(
  db: TypedSupabaseClient,
  paymentId: string,
  details: { paymentIntentId?: string | null; chargeId?: string | null; customerId?: string | null; receiptUrl?: string | null; paidAt?: Date; actor: string },
) {
  const { data: payment } = await db.from("payments").select("*, bookings(*)").eq("id", paymentId).single();
  if (!payment || !payment.bookings) throw new PaymentError("Payment not found");
  if (payment.status === "paid") return { alreadyPaid: true };

  const { data: receipt } = await db.rpc("next_document_number", { p_scope: "R" });
  const paidAt = (details.paidAt ?? new Date()).toISOString();
  const { data: flipped } = await db
    .from("payments")
    .update({
      status: "paid",
      paid_at: paidAt,
      receipt_number: receipt ?? null,
      stripe_payment_intent_id: details.paymentIntentId ?? payment.stripe_payment_intent_id,
      stripe_charge_id: details.chargeId ?? payment.stripe_charge_id,
      stripe_customer_id: details.customerId ?? payment.stripe_customer_id,
      receipt_url: details.receiptUrl ?? payment.receipt_url,
      failure_reason: null,
    })
    .eq("id", paymentId)
    .neq("status", "paid")
    .select("id")
    .maybeSingle();
  if (!flipped) return { alreadyPaid: true }; // concurrent delivery won the race

  const booking = payment.bookings;
  const newPaid = booking.amount_paid_cents + payment.amount_cents;
  const confirms = booking.status === "pending" && newPaid >= booking.deposit_cents;
  await db
    .from("bookings")
    .update({ amount_paid_cents: newPaid, ...(confirms ? { status: "confirmed" as const, confirmed_at: paidAt } : {}) })
    .eq("id", booking.id);

  const leadId = booking.lead_id;
  if (payment.kind === "deposit" || confirms) {
    await db.from("leads").update({ status: "confirmed" }).eq("id", leadId).in("status", ["contract_signed", "deposit_pending", "deposit_paid", "contract_sent"]);
    await emitDomainEvent({ type: "payment.deposit_received", leadId, bookingId: booking.id, actor: details.actor, payload: { amountCents: payment.amount_cents, receipt, reference: booking.number, detail: `Deposit of $${(payment.amount_cents / 100).toFixed(2)} received.` } });
  } else {
    await emitDomainEvent({ type: "payment.balance_received", leadId, bookingId: booking.id, actor: details.actor, payload: { amountCents: payment.amount_cents, receipt, reference: booking.number, detail: `Payment of $${(payment.amount_cents / 100).toFixed(2)} received.` } });
  }
  if (confirms) await emitDomainEvent({ type: "booking.confirmed", leadId, bookingId: booking.id, actor: details.actor, payload: { bookingNumber: booking.number } });
  await audit({ actorId: null, actorType: details.actor === "webhook" ? "webhook" : "admin", action: "payment.paid", entityType: "payment", entityId: paymentId, after: { amount: payment.amount_cents, receipt, confirms } });
  return { alreadyPaid: false, confirmed: confirms };
}

/** Admin-recorded payment (cash, Zelle, check). Human-only — never called by AI. */
export async function recordOfflinePayment(db: TypedSupabaseClient, leadId: string, input: { amountCents: number; kind: "deposit" | "balance" | "other"; note: string | null }, actor: { id: string }) {
  const svc = createServiceClient();
  const { data: booking } = await svc.from("bookings").select("id, total_cents, amount_paid_cents").eq("lead_id", leadId).maybeSingle();
  if (!booking) throw new PaymentError("Accept a quote first — there's no booking to apply this payment to.");
  if (booking.amount_paid_cents + input.amountCents > booking.total_cents) throw new PaymentError("That's more than the remaining balance.");
  const { data: p, error } = await svc.from("payments").insert({ booking_id: booking.id, kind: input.kind, status: "pending", amount_cents: input.amountCents, failure_reason: input.note ? `Offline: ${input.note}` : "Offline payment" }).select("id").single();
  if (error) throw new Error(error.message);
  await applyPaidPayment(svc, p.id, { actor: `admin:${actor.id}` });
  await audit({ actorId: actor.id, action: "payment.recorded_offline", entityType: "payment", entityId: p.id, after: input });
}

/** Admin-initiated refund through Stripe. Human-only; AI agents have no access to this. */
export async function refundPayment(paymentId: string, amountCents: number, actor: { id: string }) {
  const db = createServiceClient();
  const { data: p } = await db.from("payments").select("*").eq("id", paymentId).single();
  if (!p) throw new PaymentError("Payment not found");
  if (!["paid", "partially_refunded"].includes(p.status)) throw new PaymentError("Only paid payments can be refunded");
  if (amountCents <= 0 || amountCents > p.amount_cents - p.refunded_cents) throw new PaymentError("Invalid refund amount");
  if (!p.stripe_payment_intent_id) throw new PaymentError("This payment wasn't made through Stripe — refund it manually and record it in a note.");
  await getStripe().refunds.create({ payment_intent: p.stripe_payment_intent_id, amount: amountCents, metadata: { paymentId, actor: actor.id } }, { idempotencyKey: `refund-${paymentId}-${p.refunded_cents}-${amountCents}` });
  await audit({ actorId: actor.id, action: "payment.refund_requested", entityType: "payment", entityId: paymentId, after: { amountCents } });
  // The charge.refunded webhook applies the refund to our records.
}

/** Apply a Stripe refund total to our records (from charge.refunded). */
export async function applyRefund(db: TypedSupabaseClient, paymentIntentId: string, refundedTotalCents: number) {
  const { data: p } = await db.from("payments").select("*, bookings(id, lead_id, amount_paid_cents)").eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
  if (!p || !p.bookings) return;
  const delta = refundedTotalCents - p.refunded_cents;
  if (delta <= 0) return;
  const status = refundedTotalCents >= p.amount_cents ? "refunded" : "partially_refunded";
  await db.from("payments").update({ refunded_cents: refundedTotalCents, status }).eq("id", p.id);
  await db.from("bookings").update({ amount_paid_cents: Math.max(0, p.bookings.amount_paid_cents - delta) }).eq("id", p.bookings.id);
  await emitDomainEvent({ type: "payment.refunded", leadId: p.bookings.lead_id, bookingId: p.bookings.id, actor: "webhook", payload: { amountCents: delta } });
  await audit({ actorId: null, actorType: "webhook", action: "payment.refunded", entityType: "payment", entityId: p.id, after: { refundedTotalCents, status } });
}

/**
 * Stripe webhook dispatcher. Event IDs are recorded first for idempotency;
 * our own paymentId in metadata is the reconciliation key.
 */
export async function handleStripeEvent(db: TypedSupabaseClient, event: Stripe.Event): Promise<{ handled: boolean; duplicate?: boolean }> {
  const { error: dupErr } = await db.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dupErr) {
    if (dupErr.code === "23505") {
      const { data: prior } = await db.from("stripe_events").select("processed_at").eq("id", event.id).single();
      if (prior?.processed_at) return { handled: true, duplicate: true };
    } else throw new Error(dupErr.message);
  }

  let handled = true;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object as Stripe.Checkout.Session;
      const paymentId = s.metadata?.paymentId ?? s.client_reference_id;
      if (!paymentId) break;
      if (s.payment_status === "paid") {
        await applyPaidPayment(db, paymentId, {
          paymentIntentId: typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null),
          customerId: typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null),
          actor: "webhook",
        });
      } else {
        await db.from("payments").update({ status: "pending", stripe_payment_intent_id: typeof s.payment_intent === "string" ? s.payment_intent : null }).eq("id", paymentId).neq("status", "paid");
      }
      break;
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const s = event.data.object as Stripe.Checkout.Session;
      const paymentId = s.metadata?.paymentId ?? s.client_reference_id;
      if (!paymentId) break;
      const reason = event.type === "checkout.session.expired" ? "Checkout expired" : "Payment failed";
      const { data } = await db.from("payments").update({ status: "failed", failure_reason: reason }).eq("id", paymentId).eq("status", "pending").select("bookings(lead_id)").maybeSingle();
      if (data && event.type === "checkout.session.async_payment_failed") {
        await emitDomainEvent({ type: "payment.failed", leadId: data.bookings?.lead_id, actor: "webhook", payload: { detail: reason } });
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) await applyRefund(db, pi, charge.amount_refunded);
      break;
    }
    case "charge.succeeded": {
      // Capture the receipt URL for customer download.
      const charge = event.data.object as Stripe.Charge;
      const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (pi) await db.from("payments").update({ stripe_charge_id: charge.id, receipt_url: charge.receipt_url }).eq("stripe_payment_intent_id", pi);
      break;
    }
    default:
      handled = false;
  }
  await db.from("stripe_events").update({ processed_at: new Date().toISOString() }).eq("id", event.id);
  return { handled };
}
