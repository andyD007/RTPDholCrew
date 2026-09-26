"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/database/server";
import { env } from "@/lib/env";
import { dispatchDomainEventsSafely } from "@/lib/automation/dispatcher";
import { emitDomainEvent } from "@/lib/automation/events";
import { ContractStateError } from "@/lib/contracts/state";
import { markContractViewed, signContract } from "@/lib/contracts/service";
import { createCheckout, PaymentError } from "@/lib/payments/service";
import { PaymentsNotConfiguredError } from "@/lib/payments/stripe";
import { acceptQuote, askQuoteQuestion, declineQuote, markQuoteViewed, QuoteError } from "@/lib/quotes/service";
import { resolveAccessToken } from "@/lib/portal/access";
import { PortalError } from "@/lib/portal/errors";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/security/request";
import { cleanLine, cleanText, normalizePhone } from "@/lib/security/sanitize";
import type { TablesUpdate } from "@/types/database";

/**
 * Customer portal actions. Every action re-verifies the magic-link token and
 * scopes all reads/writes to that token's lead, then uses the service role.
 */
export type PortalResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const token = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/);
const uuid = z.string().uuid();

async function withLead<T>(rawToken: string, fn: (leadId: string) => Promise<T>, limitKey?: string): Promise<PortalResult<T>> {
  try {
    const t = token.safeParse(rawToken);
    if (!t.success) return { ok: false, error: "This link is invalid." };
    const ip = (await getClientIp()) ?? "unknown";
    const limit = await rateLimit(`portal:${limitKey ?? "action"}:${ip}`, 30, 10 * 60);
    if (!limit.ok) return { ok: false, error: "Too many requests — please wait a few minutes." };
    const access = await resolveAccessToken(t.data);
    if (!access) return { ok: false, error: "This link has expired. Please contact us for a new one." };
    const data = await fn(access.leadId);
    after(() => dispatchDomainEventsSafely());
    revalidatePath(`/portal/${rawToken}`);
    return { ok: true, data };
  } catch (err) {
    if (err instanceof QuoteError || err instanceof ContractStateError || err instanceof PaymentError || err instanceof PaymentsNotConfiguredError || err instanceof PortalError) {
      return { ok: false, error: err.message };
    }
    console.error("[portal]", err);
    return { ok: false, error: "Something went wrong. Please try again or contact us." };
  }
}

export async function acceptQuoteAction(rawToken: string, quoteId: string) {
  if (!uuid.safeParse(quoteId).success) return { ok: false, error: "Invalid quote" } as const;
  return withLead(rawToken, (leadId) => acceptQuote(leadId, quoteId).then(() => undefined), "accept");
}

export async function declineQuoteAction(rawToken: string, quoteId: string, reason: string) {
  if (!uuid.safeParse(quoteId).success) return { ok: false, error: "Invalid quote" } as const;
  return withLead(rawToken, (leadId) => declineQuote(leadId, quoteId, reason.trim() ? cleanText(reason, 500) : null), "decline");
}

export async function askQuestionAction(rawToken: string, quoteId: string, question: string) {
  const q = z.string().trim().min(5, "Please write a little more").max(2000).safeParse(question);
  if (!q.success || !uuid.safeParse(quoteId).success) return { ok: false, error: q.error?.issues[0]?.message ?? "Invalid request" } as const;
  return withLead(rawToken, (leadId) => askQuoteQuestion(leadId, quoteId, q.data), "question");
}

export async function signContractAction(rawToken: string, input: { contractId: string; signerName: string; agreed: boolean; contentHash: string }) {
  const parsed = z.object({ contractId: uuid, signerName: z.string().max(120), agreed: z.boolean(), contentHash: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid signature request" } as const;
  const [ip, ua] = await Promise.all([getClientIp(), getUserAgent()]);
  return withLead(rawToken, (leadId) => signContract(leadId, parsed.data.contractId, { ...parsed.data, signerName: cleanLine(parsed.data.signerName, 120), ip, userAgent: ua }), "sign");
}

export async function startCheckoutAction(rawToken: string, kind: "deposit" | "balance") {
  if (kind !== "deposit" && kind !== "balance") return { ok: false, error: "Invalid payment" } as const;
  return withLead(rawToken, (leadId) => createCheckout(leadId, rawToken, kind), "checkout");
}

/** Called when the customer opens a quote/contract page (records "viewed"). */
export async function recordViewAction(rawToken: string, kind: "quote" | "contract", id: string) {
  if (!uuid.safeParse(id).success) return;
  await withLead(rawToken, (leadId) => (kind === "quote" ? markQuoteViewed(leadId, id) : markContractViewed(leadId, id)), "view");
}

export async function updatePortalDetailsAction(
  rawToken: string,
  input: { phone?: string; plannerName?: string; plannerEmail?: string; plannerPhone?: string; entranceInstructions?: string; specialSongs?: string; parkingNotes?: string },
) {
  const parsed = z
    .object({
      phone: z.string().max(30).optional(),
      plannerName: z.string().max(120).optional(),
      plannerEmail: z.string().trim().toLowerCase().email().or(z.literal("")).optional(),
      plannerPhone: z.string().max(30).optional(),
      entranceInstructions: z.string().max(2000).optional(),
      specialSongs: z.string().max(2000).optional(),
      parkingNotes: z.string().max(1000).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" } as const;
  const v = parsed.data;
  return withLead(rawToken, async (leadId) => {
    const db = createServiceClient();
    const { data: lead } = await db.from("leads").select("customer_id, event_id, events(venue_id)").eq("id", leadId).single();
    if (!lead) throw new Error("Lead not found");
    if (v.phone !== undefined && v.phone.replace(/\D/g, "").length >= 10) await db.from("customers").update({ phone: normalizePhone(v.phone) }).eq("id", lead.customer_id);
    const eventPatch: TablesUpdate<"events"> = {};
    if (v.plannerName !== undefined) eventPatch.planner_name = v.plannerName.trim() ? cleanLine(v.plannerName, 120) : null;
    if (v.plannerEmail !== undefined) eventPatch.planner_email = v.plannerEmail || null;
    if (v.plannerPhone !== undefined) eventPatch.planner_phone = v.plannerPhone.trim() ? normalizePhone(v.plannerPhone) : null;
    if (v.entranceInstructions !== undefined) eventPatch.entrance_instructions = v.entranceInstructions.trim() ? cleanText(v.entranceInstructions, 2000) : null;
    if (v.specialSongs !== undefined) eventPatch.special_songs = v.specialSongs.trim() ? cleanText(v.specialSongs, 2000) : null;
    if (Object.keys(eventPatch).length) await db.from("events").update(eventPatch).eq("id", lead.event_id);
    if (v.parkingNotes !== undefined && lead.events?.venue_id) await db.from("venues").update({ parking_notes: v.parkingNotes.trim() ? cleanText(v.parkingNotes, 1000) : null }).eq("id", lead.events.venue_id);
    await emitDomainEvent({ type: "portal.updated", leadId, actor: "customer", payload: { fields: Object.keys(v) } });
  }, "update");
}

export async function sendPortalMessageAction(rawToken: string, body: string) {
  const parsed = z.string().trim().min(2).max(3000).safeParse(body);
  if (!parsed.success) return { ok: false, error: "Please write a message." } as const;
  return withLead(rawToken, async (leadId) => {
    const db = createServiceClient();
    const { data: lead } = await db.from("leads").select("customer_id, reference, customers(email)").eq("id", leadId).single();
    await db.from("messages").insert({
      lead_id: leadId,
      customer_id: lead?.customer_id ?? null,
      type: "email",
      direction: "inbound",
      status: "delivered",
      sender: lead?.customers?.email ?? null,
      subject: "Message from booking portal",
      body: cleanText(parsed.data, 3000),
      provider: "portal",
    });
    await emitDomainEvent({ type: "message.received", leadId, actor: "customer", payload: { reference: lead?.reference, detail: parsed.data.slice(0, 300) } });
  }, "message");
}

const MAX_UPLOAD = 10 * 1024 * 1024;
const ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

/** Customer uploads (itinerary / venue instructions) → private documents bucket. */
export async function uploadPortalDocumentAction(rawToken: string, formData: FormData) {
  const kind = formData.get("kind");
  const file = formData.get("file");
  if ((kind !== "itinerary" && kind !== "venue_instructions") || !(file instanceof File)) return { ok: false, error: "Choose a file to upload." } as const;
  if (file.size === 0 || file.size > MAX_UPLOAD) return { ok: false, error: "Files must be under 10 MB." } as const;
  if (!ALLOWED.has(file.type)) return { ok: false, error: "Upload a PDF, Word document, image or text file." } as const;
  return withLead(rawToken, async (leadId) => {
    const db = createServiceClient();
    const { data: lead } = await db.from("leads").select("event_id").eq("id", leadId).single();
    if (!lead) throw new Error("Lead not found");
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
    const path = `leads/${leadId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await db.storage.from(env().SUPABASE_DOCUMENTS_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new PortalError("Uploads aren't available right now — please email the file to us instead.");
    await db.from("events").update(kind === "itinerary" ? { itinerary_path: path } : { venue_instructions_path: path }).eq("id", lead.event_id);
    await emitDomainEvent({ type: "portal.updated", leadId, actor: "customer", payload: { uploaded: kind } });
  }, "upload");
}
