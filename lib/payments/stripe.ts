import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

let client: Stripe | undefined;

/** Server-only Stripe client. Secret keys never reach the browser. */
export function getStripe(): Stripe {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new PaymentsNotConfiguredError();
  client ??= new Stripe(key, { maxNetworkRetries: 2, appInfo: { name: "RTP Dhol Crew", url: env().NEXT_PUBLIC_SITE_URL } });
  return client;
}

export function paymentsConfigured(): boolean {
  return Boolean(env().STRIPE_SECRET_KEY);
}

export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super("Online payments are not configured yet.");
    this.name = "PaymentsNotConfiguredError";
  }
}

/** Verify a webhook signature and parse the event (throws on mismatch). */
export function constructWebhookEvent(rawBody: string, signature: string | null, secret: string): Stripe.Event {
  if (!signature) throw new Error("Missing Stripe-Signature header");
  // A dummy key is fine for signature verification; it never makes API calls.
  const verifier = client ?? new Stripe(env().STRIPE_SECRET_KEY ?? "sk_test_verification_only");
  return verifier.webhooks.constructEvent(rawBody, signature, secret);
}
