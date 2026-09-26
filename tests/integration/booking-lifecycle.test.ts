/**
 * End-to-end booking lifecycle against a real Supabase-compatible API
 * (PostgREST + Auth + Postgres with the project migrations applied):
 *
 *   lead submission → availability check → automations (auto-reply, intake)
 *   → quote → customer accepts → contract generated → customer signs
 *   → Stripe webhook (signed) confirms deposit → booking confirmed
 *   → confirmation + reminder automations → partial refund webhook
 *
 * Skipped unless TEST_SUPABASE_URL / _ANON_KEY / _SERVICE_ROLE_KEY are set.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";

const enabled = Boolean(process.env.TEST_SUPABASE_URL);

describe.skipIf(!enabled)("booking lifecycle (integration)", async () => {
  const { createServiceClient } = await import("@/lib/database/server");
  const { availabilityRequestSchema } = await import("@/lib/validation/booking");
  const { createLeadFromRequest } = await import("@/lib/leads/create-lead");
  const { resolveAccessToken } = await import("@/lib/portal/access");
  const { dispatchPendingDomainEvents, runDueAutomations } = await import("@/lib/automation/dispatcher");
  const { createQuote, sendQuote, acceptQuote, markQuoteViewed } = await import("@/lib/quotes/service");
  const { signContract } = await import("@/lib/contracts/service");
  const { handleStripeEvent } = await import("@/lib/payments/service");
  const { constructWebhookEvent } = await import("@/lib/payments/stripe");
  const { loadLeadContext } = await import("@/lib/leads/context");

  let db!: ReturnType<typeof createServiceClient>;
  const stamp = Date.now().toString(36);
  const email = `it-${stamp}@example.com`;
  let staffId = "";
  let leadId = "";
  let token = "";
  let quoteId = "";
  let paymentId = "";

  const runAutomations = async () => {
    await dispatchPendingDomainEvents(db);
    await runDueAutomations(db);
  };

  beforeAll(async () => {
    db = createServiceClient();
    const { data, error } = await db.auth.admin.createUser({ email: `staff-${stamp}@example.com`, password: "integration-pass-123", email_confirm: true });
    if (error || !data.user) throw error ?? new Error("no user");
    staffId = data.user.id;
    await db.from("users").insert({ id: staffId, email: data.user.email!, role: "admin" });
  });

  afterAll(async () => {
    // Best-effort cleanup of everything this suite created.
    if (leadId) {
      const { data: b } = await db.from("bookings").select("id").eq("lead_id", leadId).maybeSingle();
      if (b) await db.from("payments").delete().eq("booking_id", b.id);
      await db.from("bookings").delete().eq("lead_id", leadId);
      await db.from("contracts").delete().eq("lead_id", leadId);
      await db.from("quotes").delete().eq("lead_id", leadId);
      const { data: lead } = await db.from("leads").select("event_id, customer_id").eq("id", leadId).maybeSingle();
      await db.from("leads").delete().eq("id", leadId);
      if (lead) {
        await db.from("events").delete().eq("id", lead.event_id);
        await db.from("customers").delete().eq("id", lead.customer_id);
      }
    }
    await db.from("users").delete().eq("id", staffId);
    await db.auth.admin.deleteUser(staffId);
  });

  it("stores a lead immediately with an availability verdict and a working magic link", async () => {
    const input = availabilityRequestSchema.parse({
      eventType: "baraat",
      eventDate: "2027-03-17",
      startTime: "17:30",
      durationMinutes: 45,
      venueName: "IT Test Venue",
      city: "Raleigh",
      state: "NC",
      service: "solo-dhol",
      firstName: "Integration",
      lastName: `Test${stamp}`,
      email,
      phone: "9195550199",
      specialInstructions: "Baraat starts at the hotel lobby <b>bold</b>",
    });
    const lead = await createLeadFromRequest(db, input);
    leadId = lead.leadId;
    token = lead.accessToken;
    expect(lead.reference).toMatch(/^RTP-L-\d{4}-\d{4}$/);
    // A mid-week date with nothing booked. (Conflict classification is covered by the engine unit tests.)
    expect(lead.availability.status).toBe("available");

    const ctx = await loadLeadContext(db, leadId);
    expect(ctx?.status).toBe("new");
    expect(ctx?.event.starts_at).toBe("2027-03-17T21:30:00+00:00"); // EDT (DST began Mar 14)
    expect(ctx?.event.special_instructions).toBe("Baraat starts at the hotel lobby bold"); // sanitised
    expect(ctx?.customer.phone).toBe("+19195550199");
    expect(await resolveAccessToken(token)).toEqual({ leadId });
    expect(await resolveAccessToken("x".repeat(43))).toBeNull();
  });

  it("runs lead.created automations: auto-reply + intake analysis", async () => {
    await runAutomations();
    const { data: msgs } = await db.from("messages").select("template_key, status").eq("lead_id", leadId);
    expect(msgs).toEqual(expect.arrayContaining([expect.objectContaining({ template_key: "lead.received", status: "logged" })]));
    const { data: lead } = await db.from("leads").select("ai_summary, urgency").eq("id", leadId).single();
    expect(lead?.ai_summary).toMatchObject({ provider: "rules" });
    expect(lead?.urgency).toBeTruthy();
  });

  it("sends a quote and the customer accepts it → booking + contract", async () => {
    const quote = await createQuote(
      db,
      { leadId, performanceMinutes: 45, performers: 1, items: [{ description: "Solo Dhol Player", quantity: 1, unitPriceCents: 45000 }], travelFeeCents: 0, additionalFeeCents: 0, discountCents: 0, taxRateBps: 0, depositCents: null },
      { id: staffId },
    );
    quoteId = quote.id;
    expect(quote.number).toMatch(/^RTP-Q-\d{4}-\d{4}$/);
    await sendQuote(db, quote.id, { id: staffId });
    await markQuoteViewed(leadId, quote.id);
    const { data: q } = await db.from("quotes").select("status, total_cents, deposit_cents, balance_cents").eq("id", quote.id).single();
    expect(q).toMatchObject({ status: "viewed", total_cents: 45000, deposit_cents: 13500, balance_cents: 31500 });

    await acceptQuote(leadId, quote.id);
    const ctx = await loadLeadContext(db, leadId);
    expect(ctx?.status).toBe("contract_sent");
    expect(ctx?.booking).toMatchObject({ status: "pending", total_cents: 45000, deposit_cents: 13500, amount_paid_cents: 0 });
    expect(ctx?.liveContract?.status).toBe("sent");
    expect(ctx?.liveContract?.number).toMatch(/^RTP-C-\d{4}-\d{4}$/);
    expect(ctx?.liveContract?.body).toContain(`Integration Test${stamp}`);
    await expect(acceptQuote(leadId, quote.id)).rejects.toThrow(/already been accepted/);
  });

  it("the customer signs the contract (hash-bound)", async () => {
    const ctx = await loadLeadContext(db, leadId);
    const contract = ctx!.liveContract!;
    await expect(signContract(leadId, contract.id, { signerName: "Integration", agreed: true, contentHash: contract.content_hash, ip: "203.0.113.9", userAgent: "vitest" })).rejects.toThrow(/full name/);
    await expect(signContract(leadId, contract.id, { signerName: "Integration Test", agreed: true, contentHash: "0".repeat(64), ip: null, userAgent: null })).rejects.toThrow(/updated/);
    await signContract(leadId, contract.id, { signerName: "Integration Test", agreed: true, contentHash: contract.content_hash, ip: "203.0.113.9", userAgent: "vitest" });
    const after = await loadLeadContext(db, leadId);
    expect(after?.liveContract?.status).toBe("signed");
    expect(after?.liveContract?.signature).toMatchObject({ signer_name: "Integration Test", content_hash: contract.content_hash, ip_address: "203.0.113.9" });
    expect(after?.status).toBe("contract_signed");
    const { data: pdfMail } = await db.from("messages").select("metadata").eq("lead_id", leadId).eq("template_key", "contract.signed").single();
    expect(pdfMail?.metadata).toMatchObject({ attachments: [`${contract.number}.pdf`] });
    await expect(signContract(leadId, contract.id, { signerName: "Integration Test", agreed: true, contentHash: contract.content_hash, ip: null, userAgent: null })).rejects.toThrow(/already been signed/);
  });

  it("verifies the Stripe webhook signature and confirms the booking on deposit (idempotently)", async () => {
    const ctx = await loadLeadContext(db, leadId);
    const { data: payment } = await db.from("payments").insert({ booking_id: ctx!.booking!.id, kind: "deposit", status: "pending", amount_cents: 13500, stripe_checkout_session_id: `cs_test_${stamp}` }).select("id").single();
    paymentId = payment!.id;

    const payload = JSON.stringify({
      id: `evt_test_${stamp}`,
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: `cs_test_${stamp}`, object: "checkout.session", payment_status: "paid", payment_intent: `pi_test_${stamp}`, customer: null, client_reference_id: paymentId, metadata: { paymentId, leadId, bookingId: ctx!.booking!.id, kind: "deposit" } } },
    });
    const secret = process.env.STRIPE_WEBHOOK_SECRET!;
    const header = new Stripe("sk_test_x").webhooks.generateTestHeaderString({ payload, secret });
    expect(() => constructWebhookEvent(payload, header.replace(/v1=[a-f0-9]+/, "v1=deadbeef"), secret)).toThrow();
    expect(() => constructWebhookEvent(payload.replace('"paid"', '"unpaid"'), header, secret)).toThrow();
    const event = constructWebhookEvent(payload, header, secret);

    const first = await handleStripeEvent(db, event);
    expect(first).toEqual({ handled: true });
    const confirmed = await loadLeadContext(db, leadId);
    expect(confirmed?.booking).toMatchObject({ status: "confirmed", amount_paid_cents: 13500 });
    expect(confirmed?.status).toBe("confirmed");
    const paid = confirmed!.booking!.payments.find((p) => p.id === paymentId)!;
    expect(paid).toMatchObject({ status: "paid", stripe_payment_intent_id: `pi_test_${stamp}` });
    expect(paid.receipt_number).toMatch(/^RTP-R-\d{4}-\d{4}$/);

    // Stripe retries the same event: no double counting.
    const again = await handleStripeEvent(db, event);
    expect(again).toEqual({ handled: true, duplicate: true });
    const { data: b } = await db.from("bookings").select("amount_paid_cents").eq("lead_id", leadId).single();
    expect(b?.amount_paid_cents).toBe(13500);

    const { data: events } = await db.from("domain_events").select("type").eq("lead_id", leadId);
    expect(events!.map((e) => e.type)).toEqual(expect.arrayContaining(["payment.deposit_received", "booking.confirmed", "contract.signed", "quote.accepted"]));
  });

  it("booking confirmation sends the confirmation email and arms event reminders; stale follow-ups are cancelled", async () => {
    await runAutomations();
    const { data: msg } = await db.from("messages").select("status, subject").eq("lead_id", leadId).eq("template_key", "booking.confirmed").single();
    expect(msg?.status).toBe("logged");
    expect(msg?.subject).toMatch(/You're booked/);
    const { data: runs } = await db.from("automation_runs").select("status, automation_rules(key)").eq("lead_id", leadId);
    const byKey = Object.fromEntries((runs ?? []).map((r) => [r.automation_rules!.key, r.status]));
    expect(byKey["booking.confirmation"]).toBe("succeeded");
    expect(byKey["event.seven_day"]).toBe("pending");
    expect(byKey["event.day_before"]).toBe("pending");
    expect(byKey["quote.viewed_not_accepted"]).toBe("cancelled");
  });

  it("applies partial refunds from charge.refunded", async () => {
    const payload = JSON.stringify({ id: `evt_refund_${stamp}`, object: "event", type: "charge.refunded", data: { object: { id: `ch_${stamp}`, object: "charge", payment_intent: `pi_test_${stamp}`, amount_refunded: 5000 } } });
    const header = new Stripe("sk_test_x").webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET! });
    await handleStripeEvent(db, constructWebhookEvent(payload, header, process.env.STRIPE_WEBHOOK_SECRET!));
    const { data: p } = await db.from("payments").select("status, refunded_cents").eq("id", paymentId).single();
    expect(p).toEqual({ status: "partially_refunded", refunded_cents: 5000 });
    const { data: b } = await db.from("bookings").select("amount_paid_cents").eq("lead_id", leadId).single();
    expect(b?.amount_paid_cents).toBe(8500);
  });

  it("rejects a declined or re-accepted quote path for a different lead (token scoping)", async () => {
    const { data: other } = await db.from("leads").select("id").neq("id", leadId).limit(1).single();
    await expect(acceptQuote(other!.id, quoteId)).rejects.toThrow(/not found/i);
  });
});
