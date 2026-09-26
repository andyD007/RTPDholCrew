import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { createServiceClient } from "@/lib/database/server";
import { getSetting } from "@/lib/database/settings";
import { emitDomainEvent } from "@/lib/automation/events";
import { loadLeadContext } from "@/lib/leads/context";
import { buildTemplateVars, renderMessage } from "@/lib/notifications/template-vars";
import { sendMessage } from "@/lib/notifications/send";
import { createAccessToken, customerLinks } from "@/lib/portal/access";
import { audit } from "@/lib/security/audit";
import { cleanText } from "@/lib/security/sanitize";
import { addDaysLocal, todayLocal } from "@/lib/time";
import type { ParsedQuoteInput } from "@/lib/validation/quote";
import { calculateQuote } from "./calculate";
import { generateContractForQuote } from "@/lib/contracts/service";

/** Pipeline statuses that come before "quote sent" — sending a quote advances these. */
const PRE_QUOTE = new Set(["new", "contacted", "qualified", "awaiting_customer"]);

export class QuoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteError";
  }
}

export async function createQuote(db: TypedSupabaseClient, input: ParsedQuoteInput, actor: { id: string }) {
  const deposit = await getSetting("deposit.rules", db);
  const totals = calculateQuote({
    items: input.items,
    travelFeeCents: input.travelFeeCents,
    additionalFeeCents: input.additionalFeeCents,
    discountCents: input.discountCents,
    taxRateBps: input.taxRateBps,
    depositCents: input.depositCents ?? null,
    depositRule: deposit.type === "fixed" ? { type: "fixed", amountCents: deposit.minimumCents } : { type: "percent", percent: deposit.percent, minimumCents: deposit.minimumCents },
  });
  // Document numbers are allocated by the service role (the function isn't exposed to staff sessions).
  const { data: number, error: numErr } = await createServiceClient().rpc("next_document_number", { p_scope: "Q" });
  if (numErr || !number) throw new Error(`Failed to allocate quote number: ${numErr?.message}`);
  return insertQuote(db, input, totals, number, deposit.quoteExpiryDays, actor);
}

async function insertQuote(
  db: TypedSupabaseClient,
  input: ParsedQuoteInput,
  totals: ReturnType<typeof calculateQuote>,
  number: string,
  expiryDays: number,
  actor: { id: string },
) {
  const { data: quote, error } = await db
    .from("quotes")
    .insert({
      number,
      lead_id: input.leadId,
      package_id: input.packageId ?? null,
      status: "draft",
      performance_minutes: input.performanceMinutes,
      performers: input.performers,
      base_fee_cents: totals.baseFeeCents,
      travel_fee_cents: totals.travelFeeCents,
      additional_fee_cents: totals.additionalFeeCents,
      discount_cents: totals.discountCents,
      tax_rate_bps: totals.taxRateBps,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      deposit_cents: totals.depositCents,
      balance_cents: totals.balanceCents,
      notes: input.notes ? cleanText(input.notes, 2000) : null,
      expires_on: input.expiresOn ?? addDaysLocal(todayLocal(), expiryDays),
      created_by: actor.id,
    })
    .select("id, number")
    .single();
  if (error) throw new Error(`Failed to save quote: ${error.message}`);
  const { error: itemsErr } = await db.from("quote_items").insert(
    totals.lines.map((l, i) => ({
      quote_id: quote.id,
      service_id: l.serviceId ?? null,
      description: cleanText(l.description, 160),
      quantity: l.quantity,
      unit_price_cents: l.unitPriceCents,
      total_cents: l.totalCents,
      sort_order: i,
    })),
  );
  if (itemsErr) {
    await db.from("quotes").delete().eq("id", quote.id);
    throw new Error(`Failed to save quote items: ${itemsErr.message}`);
  }
  await emitDomainEvent({ type: "quote.created", leadId: input.leadId, actor: `admin:${actor.id}`, payload: { quoteNumber: quote.number, totalCents: totals.totalCents } });
  await audit({ actorId: actor.id, action: "quote.created", entityType: "quote", entityId: quote.id, after: { number: quote.number, ...totals } });
  return quote;
}

/** Send a quote to the customer by email with a secure link. */
export async function sendQuote(db: TypedSupabaseClient, quoteId: string, actor: { id: string }) {
  const { data: quote, error } = await db.from("quotes").select("id, number, status, lead_id, total_cents").eq("id", quoteId).single();
  if (error || !quote) throw new QuoteError("Quote not found");
  if (!["draft", "sent", "viewed"].includes(quote.status)) throw new QuoteError(`A ${quote.status} quote can't be sent`);

  // Only one live quote per lead: older open quotes are superseded.
  await db.from("quotes").update({ status: "superseded" }).eq("lead_id", quote.lead_id).neq("id", quote.id).in("status", ["draft", "sent", "viewed"]);
  const { error: upErr } = await db.from("quotes").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", quote.id);
  if (upErr) throw new Error(upErr.message);

  const ctx = await loadLeadContext(db, quote.lead_id);
  if (!ctx) throw new QuoteError("Lead not found");
  if (PRE_QUOTE.has(ctx.status)) await db.from("leads").update({ status: "quote_sent" }).eq("id", ctx.id);

  const svc = createServiceClient();
  const token = await createAccessToken(ctx.id);
  const links = customerLinks(token);
  const [profile, template] = await Promise.all([
    getSetting("business.profile", db),
    svc.from("message_templates").select("subject, body").eq("key", "quote.sent").maybeSingle(),
  ]);
  const rendered = renderMessage(
    template.data ?? { subject: "Your quote from {{business_name}}", body: "Hi {{first_name}},\n\nYour quote is ready: {{quote_url}}\n\n{{business_name}}" },
    buildTemplateVars(ctx, links, profile),
  );
  const sent = await sendMessage(svc, {
    leadId: ctx.id,
    customerId: ctx.customer_id,
    channel: "email",
    to: ctx.customer.email,
    subject: rendered.subject,
    body: rendered.body,
    cta: { label: "View your quote", url: links.quote },
    templateKey: "quote.sent",
    createdBy: actor.id,
  });
  await emitDomainEvent({ type: "quote.sent", leadId: ctx.id, actor: `admin:${actor.id}`, payload: { quoteNumber: quote.number, totalCents: quote.total_cents } });
  await audit({ actorId: actor.id, action: "quote.sent", entityType: "quote", entityId: quote.id });
  return { delivery: sent.status, quoteUrl: links.quote };
}

// ── Customer actions (service client, after token verification) ────────────

export async function markQuoteViewed(leadId: string, quoteId: string) {
  const db = createServiceClient();
  const { data } = await db
    .from("quotes")
    .update({ status: "viewed", viewed_at: new Date().toISOString() })
    .eq("id", quoteId)
    .eq("lead_id", leadId)
    .eq("status", "sent")
    .select("number")
    .maybeSingle();
  if (data) await emitDomainEvent({ type: "quote.viewed", leadId, actor: "customer", payload: { quoteNumber: data.number } });
}

async function loadOpenQuote(leadId: string, quoteId: string) {
  const db = createServiceClient();
  const { data: quote } = await db.from("quotes").select("*").eq("id", quoteId).eq("lead_id", leadId).maybeSingle();
  if (!quote) throw new QuoteError("Quote not found");
  if (quote.status === "accepted") throw new QuoteError("This quote has already been accepted.");
  if (!["sent", "viewed"].includes(quote.status)) throw new QuoteError("This quote is no longer available. Please contact us for an updated quote.");
  if (quote.expires_on && quote.expires_on < todayLocal()) {
    await db.from("quotes").update({ status: "expired" }).eq("id", quote.id);
    throw new QuoteError("This quote has expired. Please contact us and we'll refresh it.");
  }
  return quote;
}

/**
 * ACCEPT QUOTE → booking (pending) + contract generated and sent automatically.
 * The date is not reserved until the contract is signed and the deposit paid.
 */
export async function acceptQuote(leadId: string, quoteId: string) {
  const db = createServiceClient();
  const quote = await loadOpenQuote(leadId, quoteId);
  const { error } = await db.from("quotes").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", quote.id).in("status", ["sent", "viewed"]);
  if (error) throw new Error(error.message);

  const { data: existing } = await db.from("bookings").select("id").eq("lead_id", leadId).maybeSingle();
  let bookingId = existing?.id;
  if (existing) {
    await db.from("bookings").update({ quote_id: quote.id, total_cents: quote.total_cents, deposit_cents: quote.deposit_cents, status: "pending" }).eq("id", existing.id);
  } else {
    const { data: number } = await db.rpc("next_document_number", { p_scope: "B" });
    const { data: booking, error: bErr } = await db
      .from("bookings")
      .insert({ number: number!, lead_id: leadId, quote_id: quote.id, status: "pending", total_cents: quote.total_cents, deposit_cents: quote.deposit_cents })
      .select("id")
      .single();
    if (bErr) throw new Error(`Failed to create booking: ${bErr.message}`);
    bookingId = booking.id;
  }
  await emitDomainEvent({ type: "quote.accepted", leadId, bookingId, actor: "customer", payload: { quoteNumber: quote.number, reference: quote.number, detail: `Quote ${quote.number} accepted.` } });
  const contract = await generateContractForQuote(db, quote.id, { send: true, actor: "system" });
  return { bookingId, contractId: contract.id };
}

export async function declineQuote(leadId: string, quoteId: string, reason: string | null) {
  const db = createServiceClient();
  const quote = await loadOpenQuote(leadId, quoteId);
  await db.from("quotes").update({ status: "declined", declined_at: new Date().toISOString(), decline_reason: reason }).eq("id", quote.id);
  // The customer chose not to proceed — close the lead and stop follow-ups.
  await db.from("leads").update({ status: "lost", lost_reason: reason ? `Declined quote: ${reason}` : "Declined quote" }).eq("id", leadId);
  await db.from("automation_runs").update({ status: "cancelled", error: "Quote declined" }).eq("lead_id", leadId).eq("status", "pending");
  await emitDomainEvent({ type: "quote.declined", leadId, actor: "customer", payload: { quoteNumber: quote.number, reference: quote.number, detail: reason ? `Reason: ${reason}` : "No reason given." } });
}

export async function askQuoteQuestion(leadId: string, quoteId: string, question: string) {
  const db = createServiceClient();
  const { data: quote } = await db.from("quotes").select("id, number, lead_id, leads(customer_id, customers(email))").eq("id", quoteId).eq("lead_id", leadId).single();
  if (!quote) throw new QuoteError("Quote not found");
  const text = cleanText(question, 2000);
  await db.from("quotes").update({ customer_question: text }).eq("id", quote.id);
  await db.from("messages").insert({
    lead_id: leadId,
    customer_id: quote.leads?.customer_id ?? null,
    type: "email",
    direction: "inbound",
    status: "delivered",
    sender: quote.leads?.customers?.email ?? null,
    subject: `Question about quote ${quote.number}`,
    body: text,
    provider: "portal",
  });
  await emitDomainEvent({ type: "quote.question", leadId, actor: "customer", payload: { quoteNumber: quote.number, reference: quote.number, detail: text.slice(0, 300) } });
}
