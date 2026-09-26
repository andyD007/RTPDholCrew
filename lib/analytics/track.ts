"use client";

/**
 * One place to fire conversion events to GA4 and Meta Pixel. Both are optional
 * and loaded only when their IDs are configured (see components/layout/analytics.tsx).
 */
type GtagFn = (command: "event", name: string, params?: Record<string, unknown>) => void;
type FbqFn = (command: "track" | "trackCustom", name: string, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    fbq?: FbqFn;
  }
}

export type ConversionEvent =
  | { name: "check_availability_open"; params?: { source?: string } }
  | { name: "check_availability_step"; params: { step: number; stepName: string } }
  | { name: "lead_submitted"; params: { eventType: string; service?: string } }
  | { name: "quote_accepted"; params: { valueCents: number } }
  | { name: "contract_signed" }
  | { name: "deposit_checkout_started"; params: { valueCents: number } }
  | { name: "deposit_paid"; params: { valueCents: number } }
  | { name: "contact_click"; params: { method: "phone" | "email" | "instagram" } };

const META_STANDARD: Partial<Record<ConversionEvent["name"], string>> = {
  lead_submitted: "Lead",
  deposit_checkout_started: "InitiateCheckout",
  deposit_paid: "Purchase",
  contact_click: "Contact",
  contract_signed: "CompleteRegistration",
};

export function track(event: ConversionEvent) {
  if (typeof window === "undefined") return;
  const params = ("params" in event ? event.params : undefined) as Record<string, unknown> | undefined;
  const value = params && typeof params.valueCents === "number" ? params.valueCents / 100 : undefined;
  try {
    window.gtag?.("event", event.name, { ...params, ...(value !== undefined ? { value, currency: "USD" } : {}) });
    const metaName = META_STANDARD[event.name];
    if (metaName) window.fbq?.("track", metaName, value !== undefined ? { value, currency: "USD" } : undefined);
    else window.fbq?.("trackCustom", event.name, params);
  } catch {
    // Analytics must never break the UI.
  }
}
