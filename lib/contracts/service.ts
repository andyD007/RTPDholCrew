import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { createServiceClient } from "@/lib/database/server";
import { getSetting } from "@/lib/database/settings";
import { emitDomainEvent } from "@/lib/automation/events";
import { loadLeadContext, serviceLabel, type LeadContext } from "@/lib/leads/context";
import { buildTemplateVars, renderMessage } from "@/lib/notifications/template-vars";
import { sendMessage } from "@/lib/notifications/send";
import { createAccessToken, customerLinks } from "@/lib/portal/access";
import { audit } from "@/lib/security/audit";
import { sha256Hex } from "@/lib/security/tokens";
import { cleanText } from "@/lib/security/sanitize";
import { env } from "@/lib/env";
import { absoluteUrl } from "@/lib/utils";
import { renderContractPdf } from "@/lib/pdf/contract-pdf";
import type { Json } from "@/types/database";
import { buildContractVariables, renderTemplate } from "./render";
import { ContractStateError, nextStatus, validateSignature, type ContractStatus } from "./state";

export async function generateContractForQuote(db: TypedSupabaseClient, quoteId: string, opts: { send: boolean; actor: string }) {
  const svc = createServiceClient();
  const { data: quote } = await svc.from("quotes").select("id, number, lead_id, total_cents, deposit_cents, balance_cents").eq("id", quoteId).single();
  if (!quote) throw new Error("Quote not found");
  const ctx = await loadLeadContext(svc, quote.lead_id);
  if (!ctx) throw new Error("Lead not found");

  const { data: template } = await svc.from("contract_templates").select("*").eq("is_default", true).eq("is_active", true).maybeSingle();
  if (!template) throw new Error("No active default contract template. Set one in Admin → Settings → Contract.");

  const [profile, policies, numberRes] = await Promise.all([
    getSetting("business.profile", svc),
    getSetting("contract.policies", svc),
    svc.rpc("next_document_number", { p_scope: "C" }),
  ]);
  if (!numberRes.data) throw new Error(`Failed to allocate contract number: ${numberRes.error?.message}`);

  const variables = buildContractVariables({
    businessName: profile.name,
    customer: { firstName: ctx.customer.first_name, lastName: ctx.customer.last_name, email: ctx.customer.email },
    eventTypeName: ctx.event.eventType?.name ?? "Event",
    event: {
      date: ctx.event.event_date,
      startTime: ctx.event.start_time,
      endTime: ctx.event.end_time,
      durationMinutes: ctx.event.duration_minutes,
      specialInstructions: ctx.event.special_instructions,
    },
    venue: ctx.event.venue,
    serviceName: serviceLabel(ctx),
    quote: { number: quote.number, totalCents: quote.total_cents, depositCents: quote.deposit_cents, balanceCents: quote.balance_cents },
    policies,
    contractNumber: numberRes.data,
  });
  const body = renderTemplate(template.body, variables).body;

  // Void any previous live contract for this lead (a new accepted quote replaces it).
  await svc.from("contracts").update({ status: "void", voided_at: new Date().toISOString(), void_reason: "Replaced by a new contract" }).eq("lead_id", ctx.id).in("status", ["draft", "sent", "viewed"]);

  const status: ContractStatus = opts.send ? "sent" : "draft";
  const { data: contract, error } = await svc
    .from("contracts")
    .insert({
      number: numberRes.data,
      lead_id: ctx.id,
      quote_id: quote.id,
      template_id: template.id,
      template_version: template.version,
      status,
      body,
      variables: variables as unknown as Json,
      content_hash: sha256Hex(body),
      sent_at: opts.send ? new Date().toISOString() : null,
    })
    .select("id, number")
    .single();
  if (error) throw new Error(`Failed to create contract: ${error.message}`);
  await svc.from("bookings").update({ contract_id: contract.id }).eq("lead_id", ctx.id);

  if (opts.send) await deliverContract(ctx, contract.number);
  return contract;
}

async function deliverContract(ctx: LeadContext, contractNumber: string) {
  const svc = createServiceClient();
  await svc.from("leads").update({ status: "contract_sent" }).eq("id", ctx.id).in("status", ["new", "contacted", "qualified", "quote_sent", "awaiting_customer"]);
  const token = await createAccessToken(ctx.id);
  const links = customerLinks(token);
  const profile = await getSetting("business.profile", svc);
  const { data: template } = await svc.from("message_templates").select("subject, body").eq("key", "contract.sent").maybeSingle();
  const rendered = renderMessage(template ?? { subject: "Your agreement is ready to sign", body: "Hi {{first_name}},\n\nPlease review and sign: {{contract_url}}" }, buildTemplateVars(ctx, links, profile));
  await sendMessage(svc, {
    leadId: ctx.id,
    customerId: ctx.customer_id,
    channel: "email",
    to: ctx.customer.email,
    subject: rendered.subject,
    body: rendered.body,
    cta: { label: "Review & sign", url: links.contract },
    templateKey: "contract.sent",
  });
  await emitDomainEvent({ type: "contract.sent", leadId: ctx.id, payload: { contractNumber } });
}

/** Admin: (re)send the current live contract, or create one from the accepted quote. */
export async function sendContract(db: TypedSupabaseClient, leadId: string, actor: { id: string }) {
  const ctx = await loadLeadContext(db, leadId);
  if (!ctx) throw new Error("Lead not found");
  const live = ctx.liveContract;
  if (live?.status === "signed") throw new ContractStateError("The contract is already signed.");
  if (!live) {
    const accepted = ctx.quotes.find((q) => q.status === "accepted");
    if (!accepted) throw new ContractStateError("The customer needs to accept a quote first.");
    const c = await generateContractForQuote(db, accepted.id, { send: true, actor: `admin:${actor.id}` });
    await audit({ actorId: actor.id, action: "contract.sent", entityType: "contract", entityId: c.id });
    return;
  }
  const svc = createServiceClient();
  if (live.status === "draft") await svc.from("contracts").update({ status: nextStatus("draft", "send"), sent_at: new Date().toISOString() }).eq("id", live.id);
  await deliverContract(ctx, live.number);
  await audit({ actorId: actor.id, action: "contract.sent", entityType: "contract", entityId: live.id });
}

/** Admin edit of an unsigned contract's text (re-hashed so signing binds to exactly this text). */
export async function editContractBody(db: TypedSupabaseClient, contractId: string, body: string, actor: { id: string }) {
  const { data: c } = await db.from("contracts").select("id, status, body").eq("id", contractId).single();
  if (!c) throw new Error("Contract not found");
  nextStatus(c.status, "edit");
  const clean = cleanText(body, 50_000);
  const { error } = await db.from("contracts").update({ body: clean, content_hash: sha256Hex(clean) }).eq("id", contractId);
  if (error) throw new Error(error.message);
  await audit({ actorId: actor.id, action: "contract.edited", entityType: "contract", entityId: contractId, before: { body: c.body }, after: { body: clean } });
}

export async function voidContract(db: TypedSupabaseClient, contractId: string, reason: string, actor: { id: string }) {
  const { data: c } = await db.from("contracts").select("id, status, lead_id").eq("id", contractId).single();
  if (!c) throw new Error("Contract not found");
  const to = nextStatus(c.status, "void");
  const { error } = await db.from("contracts").update({ status: to, voided_at: new Date().toISOString(), void_reason: cleanText(reason, 500) }).eq("id", contractId);
  if (error) throw new Error(error.message);
  await audit({ actorId: actor.id, action: "contract.voided", entityType: "contract", entityId: contractId, before: { status: c.status }, after: { status: to, reason } });
}

// ── Customer ────────────────────────────────────────────────────────────────

export async function markContractViewed(leadId: string, contractId: string) {
  const svc = createServiceClient();
  const { data } = await svc
    .from("contracts")
    .update({ status: "viewed", viewed_at: new Date().toISOString() })
    .eq("id", contractId)
    .eq("lead_id", leadId)
    .eq("status", "sent")
    .select("number")
    .maybeSingle();
  if (data) await emitDomainEvent({ type: "contract.viewed", leadId, actor: "customer", payload: { contractNumber: data.number } });
}

export async function signContract(
  leadId: string,
  contractId: string,
  input: { signerName: string; agreed: boolean; contentHash: string; ip: string | null; userAgent: string | null },
) {
  const svc = createServiceClient();
  const { data: c } = await svc.from("contracts").select("*").eq("id", contractId).eq("lead_id", leadId).single();
  if (!c) throw new ContractStateError("Contract not found");
  if (c.status === "signed") throw new ContractStateError("This contract has already been signed.");
  const to = nextStatus(c.status, "sign");
  const problem = validateSignature({ signerName: input.signerName, agreed: input.agreed, expectedHash: c.content_hash, presentedHash: input.contentHash });
  if (problem) throw new ContractStateError(problem);

  const ctx = await loadLeadContext(svc, leadId);
  if (!ctx) throw new Error("Lead not found");
  const signedAt = new Date().toISOString();
  const { error: sigErr } = await svc.from("contract_signatures").insert({
    contract_id: c.id,
    signer_name: input.signerName.trim(),
    signer_email: ctx.customer.email,
    agreed: true,
    signed_at: signedAt,
    ip_address: env().CONTRACT_STORE_SIGNER_IP ? input.ip : null,
    user_agent: input.userAgent,
    contract_version: c.template_version,
    content_hash: c.content_hash,
  });
  if (sigErr) throw new ContractStateError(sigErr.code === "23505" ? "This contract has already been signed." : sigErr.message);
  // Guard against a concurrent void/edit: only flip status if it's still signable.
  const { data: updated } = await svc.from("contracts").update({ status: to, signed_at: signedAt }).eq("id", c.id).in("status", ["sent", "viewed"]).select("id").maybeSingle();
  if (!updated) throw new ContractStateError("This contract changed while you were signing. Please reload.");

  await svc.from("leads").update({ status: "contract_signed" }).eq("id", leadId).in("status", ["new", "contacted", "qualified", "quote_sent", "awaiting_customer", "contract_sent"]);
  await emitDomainEvent({ type: "contract.signed", leadId, bookingId: ctx.booking?.id, actor: "customer", payload: { contractNumber: c.number, reference: c.number, detail: `Signed by ${input.signerName.trim()}.` } });
  await audit({ actorId: null, actorType: "customer", action: "contract.signed", entityType: "contract", entityId: c.id, after: { signer: input.signerName.trim(), hash: c.content_hash } });

  // Email the signed PDF to the customer and the business.
  try {
    const pdf = await renderContractPdf({ contract: { ...c, status: "signed", signed_at: signedAt }, signature: { signer_name: input.signerName.trim(), signed_at: signedAt, ip_address: env().CONTRACT_STORE_SIGNER_IP ? input.ip : null, content_hash: c.content_hash } });
    const attachment = { filename: `${c.number}.pdf`, content: Buffer.from(pdf), contentType: "application/pdf" };
    const token = await createAccessToken(leadId);
    await sendMessage(svc, {
      leadId,
      customerId: ctx.customer_id,
      channel: "email",
      to: ctx.customer.email,
      subject: `Signed agreement ${c.number}`,
      body: `Hi ${ctx.customer.first_name},\n\nThank you for signing! Your signed agreement is attached for your records.\n\nThe last step to reserve your date is the deposit — you can pay securely in your booking portal.`,
      cta: { label: "Pay deposit", url: customerLinks(token).portal },
      attachments: [attachment],
      templateKey: "contract.signed",
    });
    const adminTo = env().ADMIN_NOTIFICATION_EMAIL;
    if (adminTo) {
      await sendMessage(svc, { leadId, channel: "email", to: adminTo, subject: `[RTP] Signed: ${c.number} — ${ctx.event.title}`, body: `Signed by ${input.signerName.trim()} at ${signedAt}.`, cta: { label: "Open lead", url: absoluteUrl(`/admin/leads/${leadId}`) }, attachments: [attachment], templateKey: "admin.contract_signed" });
    }
  } catch (err) {
    console.error("[contract] failed to email signed PDF", err);
  }
  return { status: to };
}
