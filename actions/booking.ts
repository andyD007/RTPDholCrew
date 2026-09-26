"use server";

import { after } from "next/server";
import { z } from "zod";
import { createServiceClient, isSupabaseConfigured } from "@/lib/database/server";
import { env } from "@/lib/env";
import { createLeadFromRequest, LeadInputError } from "@/lib/leads/create-lead";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request";
import { cleanLine, cleanText, normalizePhone } from "@/lib/security/sanitize";
import { todayLocal } from "@/lib/time";
import { availabilityRequestSchema, contactSchema, validateEventDate, type AvailabilityRequestInput, type ContactInput } from "@/lib/validation/booking";
import { dispatchDomainEventsSafely } from "@/lib/automation/dispatcher";
import { emitDomainEvent } from "@/lib/automation/events";

export type SubmitAvailabilityResult =
  | {
      ok: true;
      reference: string;
      portalPath: string | null;
      availability: "available" | "manual_review" | "unavailable";
      demo?: boolean;
    }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const MIN_FILL_MS = 3000;

export async function submitAvailabilityRequest(raw: AvailabilityRequestInput): Promise<SubmitAvailabilityResult> {
  const parsed = availabilityRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };
  }
  const input = parsed.data;

  // Bot traps: honeypot + minimum time on form. Respond "successfully" so bots learn nothing.
  if (input.website || (input.startedAt && Date.now() - input.startedAt < MIN_FILL_MS)) {
    return { ok: true, reference: "RTP-L-PENDING", portalPath: null, availability: "manual_review" };
  }

  const dateError = validateEventDate(input.eventDate, todayLocal());
  if (dateError) return { ok: false, error: dateError, fieldErrors: { eventDate: dateError } };

  const ip = (await getClientIp()) ?? "unknown";
  const [perIp, perEmail] = await Promise.all([
    rateLimit(`lead:ip:${ip}`, 5, 60 * 60),
    rateLimit(`lead:email:${input.email}`, 3, 60 * 60),
  ]);
  if (!perIp.ok || !perEmail.ok) {
    return { ok: false, error: "We've received several requests from you recently. Please call or email us and we'll help right away." };
  }

  if (!isSupabaseConfigured()) {
    if (env().NODE_ENV !== "production") {
      console.info("[booking] Supabase not configured — demo submission:", { ...input, email: "<redacted>", phone: "<redacted>" });
      return { ok: true, reference: "RTP-L-DEMO", portalPath: null, availability: "available", demo: true };
    }
    return { ok: false, error: "Online booking is temporarily unavailable. Please call or email us to check your date." };
  }

  try {
    const db = createServiceClient();
    const lead = await createLeadFromRequest(db, input);
    after(() => dispatchDomainEventsSafely());
    return {
      ok: true,
      reference: lead.reference,
      portalPath: `/portal/${lead.accessToken}`,
      availability: lead.availability.status,
    };
  } catch (err) {
    if (err instanceof LeadInputError) return { ok: false, error: err.message };
    console.error("[booking] failed to create lead", err);
    return { ok: false, error: "Something went wrong saving your request. Please try again, or call us — we'd love to help." };
  }
}

export type ContactResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** General contact form → customer + inbound message in the CRM inbox. */
export async function submitContactMessage(raw: ContactInput): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: flattenErrors(parsed.error) };
  const input = parsed.data;
  if (input.website) return { ok: true };

  const ip = (await getClientIp()) ?? "unknown";
  const limit = await rateLimit(`contact:ip:${ip}`, 5, 60 * 60);
  if (!limit.ok) return { ok: false, error: "Too many messages — please try again later or call us." };

  if (!isSupabaseConfigured()) {
    if (env().NODE_ENV !== "production") return { ok: true };
    return { ok: false, error: "Messaging is temporarily unavailable. Please email or call us." };
  }

  try {
    const db = createServiceClient();
    const [first, ...rest] = cleanLine(input.name, 120).split(" ");
    const { data: existing } = await db.from("customers").select("id").eq("email", input.email).maybeSingle();
    let customerId = existing?.id;
    if (!customerId) {
      const { data, error } = await db
        .from("customers")
        .insert({ first_name: first, last_name: rest.join(" ") || "-", email: input.email, phone: input.phone ? normalizePhone(input.phone) : null })
        .select("id")
        .single();
      if (error) throw error;
      customerId = data.id;
    }
    const { error } = await db.from("messages").insert({
      customer_id: customerId,
      type: "email",
      direction: "inbound",
      status: "delivered",
      sender: input.email,
      subject: input.topic ? `Website contact: ${cleanLine(input.topic, 60)}` : "Website contact form",
      body: cleanText(input.message, 3000),
      provider: "website",
      metadata: { phone: input.phone ?? null, topic: input.topic ?? null },
    });
    if (error) throw error;
    await emitDomainEvent({ type: "message.received", actor: "customer", payload: { customerId, topic: input.topic ?? null } });
    after(() => dispatchDomainEventsSafely());
    return { ok: true };
  } catch (err) {
    console.error("[contact] failed", err);
    return { ok: false, error: "Something went wrong. Please email or call us." };
  }
}

function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
