import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { createServiceClient, isSupabaseConfigured } from "@/lib/database/server";
import { env } from "@/lib/env";
import { constructWebhookEvent } from "@/lib/payments/stripe";
import { handleStripeEvent } from "@/lib/payments/service";
import { dispatchDomainEventsSafely } from "@/lib/automation/dispatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. The raw body is verified against STRIPE_WEBHOOK_SECRET
 * before anything is trusted; unverified requests get 400.
 *
 * Subscribe to: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired,
 * charge.succeeded, charge.refunded
 */
export async function POST(request: NextRequest) {
  const secret = env().STRIPE_WEBHOOK_SECRET;
  if (!secret || !isSupabaseConfigured()) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const raw = await request.text();
  let event;
  try {
    event = constructWebhookEvent(raw, request.headers.get("stripe-signature"), secret);
  } catch (err) {
    console.warn("[stripe] signature verification failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(createServiceClient(), event);
    after(() => dispatchDomainEventsSafely());
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    console.error(`[stripe] failed to handle ${event.type} ${event.id}`, err);
    // 500 → Stripe retries with backoff; handlers are idempotent.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}
