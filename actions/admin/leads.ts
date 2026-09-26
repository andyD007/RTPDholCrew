"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { staffAction, uuid } from "@/lib/actions";
import { analyzeLead, buildEventBrief, draftCustomerResponse } from "@/lib/agents";
import { RESPONSE_PURPOSES } from "@/lib/agents/types";
import { dispatchDomainEventsSafely } from "@/lib/automation/dispatcher";
import { refreshLeadAvailability } from "@/lib/availability/service";
import { changeLeadStatus, overrideAvailability, updateEventDetails } from "@/lib/leads/mutations";
import { LEAD_STATUSES } from "@/lib/leads/status";
import { sendMessage } from "@/lib/notifications/send";
import { createAccessToken, customerLinks, revokeLeadTokens } from "@/lib/portal/access";
import { audit } from "@/lib/security/audit";
import { cleanLine, cleanText } from "@/lib/security/sanitize";
import { createServiceClient } from "@/lib/database/server";
import { DATE_RE, TIME_RE } from "@/lib/validation/booking";

const revalidateLead = (id: string) => {
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
};

export const updateLeadStatusAction = staffAction(
  z.object({ leadId: uuid, status: z.enum(LEAD_STATUSES as [string, ...string[]]), reason: z.string().max(500).optional() }),
  async ({ leadId, status, reason }, { db, userId }) => {
    const res = await changeLeadStatus(db, leadId, status as (typeof LEAD_STATUSES)[number], { id: userId }, reason);
    after(() => dispatchDomainEventsSafely());
    revalidateLead(leadId);
    return res;
  },
);

export const overrideAvailabilityAction = staffAction(
  z.object({ leadId: uuid, status: z.enum(["available", "manual_review", "unavailable"]).nullable(), note: z.string().max(500).optional() }),
  async ({ leadId, status, note }, { db, userId }) => {
    await overrideAvailability(db, leadId, status, { id: userId }, note);
    revalidateLead(leadId);
  },
);

export const recheckAvailabilityAction = staffAction(z.object({ leadId: uuid }), async ({ leadId }, { db }) => {
  const res = await refreshLeadAvailability(db, leadId);
  revalidateLead(leadId);
  return res ? { status: res.status, summary: res.summary } : null;
});

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? cleanText(v, max) : null));

export const updateEventDetailsAction = staffAction(
  z.object({
    leadId: uuid,
    title: z.string().trim().min(2).max(160),
    eventDate: z.string().regex(DATE_RE, "Invalid date"),
    startTime: z.string().regex(TIME_RE, "Invalid time"),
    durationMinutes: z.coerce.number().int().min(15).max(720),
    travelBufferMinutes: z.coerce.number().int().min(0).max(600),
    guestCount: z.coerce.number().int().min(0).max(10000).nullable().optional(),
    plannerName: optionalText(120),
    plannerEmail: z.string().trim().email().or(z.literal("")).nullable().optional(),
    plannerPhone: optionalText(40),
    specialInstructions: optionalText(2000),
    entranceInstructions: optionalText(2000),
    specialSongs: optionalText(2000),
    venueName: z.string().trim().min(2).max(160),
    street: optionalText(200),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().length(2),
    postalCode: optionalText(10),
    setting: z.enum(["indoor", "outdoor", "mixed", "unknown"]),
    parkingNotes: optionalText(1000),
  }),
  async (i, { db, userId }) => {
    await updateEventDetails(
      db,
      i.leadId,
      {
        title: cleanLine(i.title, 160),
        eventDate: i.eventDate,
        startTime: i.startTime,
        durationMinutes: i.durationMinutes,
        travelBufferMinutes: i.travelBufferMinutes,
        guestCount: i.guestCount ?? null,
        plannerName: i.plannerName,
        plannerEmail: i.plannerEmail || null,
        plannerPhone: i.plannerPhone,
        specialInstructions: i.specialInstructions,
        entranceInstructions: i.entranceInstructions,
        specialSongs: i.specialSongs,
        venue: { name: cleanLine(i.venueName, 160), street: i.street, city: cleanLine(i.city, 80), state: i.state.toUpperCase(), postalCode: i.postalCode, setting: i.setting, parkingNotes: i.parkingNotes },
      },
      { id: userId },
    );
    after(() => dispatchDomainEventsSafely());
    revalidateLead(i.leadId);
  },
);

export const addNoteAction = staffAction(z.object({ leadId: uuid, body: z.string().trim().min(1).max(4000), pinned: z.boolean().optional() }), async ({ leadId, body, pinned }, { db, userId }) => {
  const { error } = await db.from("admin_notes").insert({ lead_id: leadId, body: cleanText(body, 4000), author_id: userId, is_pinned: pinned ?? false });
  if (error) throw new Error(error.message);
  revalidateLead(leadId);
});

export const toggleNotePinAction = staffAction(z.object({ noteId: uuid, leadId: uuid, pinned: z.boolean() }), async ({ noteId, leadId, pinned }, { db }) => {
  const { error } = await db.from("admin_notes").update({ is_pinned: pinned }).eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidateLead(leadId);
});

export const deleteNoteAction = staffAction(
  z.object({ noteId: uuid, leadId: uuid }),
  async ({ noteId, leadId }, { db, userId }) => {
    const { error } = await db.from("admin_notes").delete().eq("id", noteId);
    if (error) throw new Error(error.message);
    await audit({ actorId: userId, action: "note.deleted", entityType: "admin_note", entityId: noteId });
    revalidateLead(leadId);
  },
  { role: "admin" },
);

export const runLeadAnalysisAction = staffAction(z.object({ leadId: uuid }), async ({ leadId }, { db }) => {
  const res = await analyzeLead(db, leadId);
  revalidateLead(leadId);
  return { provider: res.provider, usedFallback: res.usedFallback };
});

export const draftMessageAction = staffAction(
  z.object({
    leadId: uuid,
    purpose: z.enum(RESPONSE_PURPOSES),
    channel: z.enum(["email", "sms"]),
    instructions: z.string().max(1000).optional(),
  }),
  async ({ leadId, purpose, channel, instructions }, { db }) => {
    const res = await draftCustomerResponse(db, leadId, purpose, channel, { instructions });
    revalidateLead(leadId);
    revalidatePath("/admin/messages");
    return { messageId: res.messageId, provider: res.provider };
  },
);

/** APPROVE & SEND: send an (optionally edited) draft. */
export const approveDraftAction = staffAction(
  z.object({ messageId: uuid, subject: z.string().max(200).nullable().optional(), body: z.string().trim().min(2).max(5000) }),
  async ({ messageId, subject, body }, { db, userId }) => {
    const { data: draft, error } = await db.from("messages").select("*").eq("id", messageId).single();
    if (error || !draft) throw new Error("Draft not found");
    if (draft.status !== "draft") throw new Error("This message has already been handled.");
    const channel = (draft.metadata as { channel?: string } | null)?.channel === "sms" || draft.type === "sms" ? "sms" : "email";
    if (!draft.recipient) throw new Error(`Customer has no ${channel === "sms" ? "phone number" : "email"} on file.`);
    // Service client for the send (writes to the log are system-owned); staff authorisation already checked.
    const res = await sendMessage(createServiceClient(), {
      leadId: draft.lead_id,
      bookingId: draft.booking_id,
      customerId: draft.customer_id,
      channel,
      to: draft.recipient,
      subject: channel === "email" ? (subject ?? draft.subject) : null,
      body: cleanText(body, 5000),
      templateKey: draft.template_key,
      aiGenerationId: draft.ai_generation_id,
      automationRunId: draft.automation_run_id,
      createdBy: userId,
      draftMessageId: draft.id,
    });
    if (draft.ai_generation_id) {
      await db.from("ai_generations").update({ status: "approved", reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", draft.ai_generation_id);
    }
    if (draft.lead_id) revalidateLead(draft.lead_id);
    revalidatePath("/admin/messages");
    if (res.status === "failed") return { ok: false as const, error: `Send failed: ${res.error}` };
    return { ok: true as const, data: { status: res.status }, message: res.status === "logged" ? "Logged (email/SMS provider not configured)" : "Sent" };
  },
);

export const discardDraftAction = staffAction(z.object({ messageId: uuid }), async ({ messageId }, { db, userId }) => {
  const { data: draft } = await db.from("messages").select("lead_id, ai_generation_id, status").eq("id", messageId).single();
  if (!draft || draft.status !== "draft") throw new Error("Draft not found");
  await db.from("messages").update({ status: "discarded" }).eq("id", messageId);
  if (draft.ai_generation_id) await db.from("ai_generations").update({ status: "discarded", reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", draft.ai_generation_id);
  if (draft.lead_id) revalidateLead(draft.lead_id);
  revalidatePath("/admin/messages");
});

export const sendCustomMessageAction = staffAction(
  z.object({ leadId: uuid, channel: z.enum(["email", "sms"]), subject: z.string().max(200).optional(), body: z.string().trim().min(2).max(5000), includePortalLink: z.boolean().optional() }),
  async ({ leadId, channel, subject, body, includePortalLink }, { db, userId }) => {
    const { data: lead } = await db.from("leads").select("id, customer_id, customers(email, phone), bookings(id)").eq("id", leadId).single();
    if (!lead?.customers) throw new Error("Lead not found");
    const to = channel === "email" ? lead.customers.email : lead.customers.phone;
    if (!to) throw new Error(`Customer has no ${channel === "email" ? "email" : "phone"} on file.`);
    let text = cleanText(body, 5000);
    let cta: { label: string; url: string } | undefined;
    if (includePortalLink) {
      const link = customerLinks(await createAccessToken(leadId)).portal;
      if (channel === "sms") text += `\n${link}`;
      else cta = { label: "Open your booking portal", url: link };
    }
    const res = await sendMessage(createServiceClient(), { leadId, bookingId: lead.bookings?.id, customerId: lead.customer_id, channel, to, subject: subject || "A message from RTP Dhol Crew", body: text, cta, createdBy: userId });
    revalidateLead(leadId);
    if (res.status === "failed") return { ok: false as const, error: `Send failed: ${res.error}` };
    return { ok: true as const, data: { status: res.status }, message: res.status === "logged" ? "Logged (provider not configured)" : "Sent" };
  },
);

export const generateBriefAction = staffAction(z.object({ leadId: uuid }), async ({ leadId }, { db }) => {
  const res = await buildEventBrief(db, leadId);
  revalidatePath(`/admin/leads/${leadId}/brief`);
  return { generationId: res.generationId };
});

export const createPortalLinkAction = staffAction(z.object({ leadId: uuid }), async ({ leadId }, { userId }) => {
  const token = await createAccessToken(leadId, 90);
  await audit({ actorId: userId, action: "portal_link.created", entityType: "lead", entityId: leadId });
  return customerLinks(token);
});

export const revokePortalLinksAction = staffAction(
  z.object({ leadId: uuid }),
  async ({ leadId }, { userId }) => {
    await revokeLeadTokens(leadId);
    await audit({ actorId: userId, action: "portal_links.revoked", entityType: "lead", entityId: leadId });
  },
  { role: "admin" },
);
