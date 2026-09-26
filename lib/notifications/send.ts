import "server-only";
import type { TypedSupabaseClient } from "@/lib/database/server";
import { getEmailProvider, type EmailAttachment } from "@/lib/email/provider";
import { renderEmailHtml } from "@/lib/email/layout";
import { getSmsProvider } from "@/lib/sms/provider";
import { env } from "@/lib/env";
import type { Json } from "@/types/database";

/**
 * The single path for outbound customer communication. Every message is
 * written to the `messages` table (the CRM communication log) with its final
 * delivery status — sent, logged (dev fallback) or failed.
 */
export type OutboundMessage = {
  leadId?: string | null;
  bookingId?: string | null;
  customerId?: string | null;
  channel: "email" | "sms";
  to: string;
  subject?: string | null;
  body: string;
  cta?: { label: string; url: string };
  attachments?: EmailAttachment[];
  templateKey?: string | null;
  createdBy?: string | null;
  aiGenerationId?: string | null;
  automationRunId?: string | null;
  /** When set, update this existing draft row instead of inserting a new one. */
  draftMessageId?: string | null;
};

export type OutboundResult = { messageId: string; status: "sent" | "logged" | "failed"; error?: string };

export async function sendMessage(db: TypedSupabaseClient, m: OutboundMessage): Promise<OutboundResult> {
  let status: OutboundResult["status"] = "failed";
  let provider = "none";
  let providerId: string | null = null;
  let errorText: string | undefined;
  const subject = m.channel === "email" ? (m.subject ?? "RTP Dhol Crew") : null;

  try {
    if (m.channel === "email") {
      const result = await getEmailProvider().send({
        to: m.to,
        subject: subject!,
        text: m.body + (m.cta ? `\n\n${m.cta.label}: ${m.cta.url}` : ""),
        html: renderEmailHtml({ subject: subject!, body: m.body, cta: m.cta }),
        attachments: m.attachments,
        tags: m.templateKey ? [{ name: "template", value: m.templateKey.replace(/[^a-zA-Z0-9_-]/g, "_") }] : undefined,
      });
      provider = result.provider;
      providerId = result.id;
      status = result.delivered ? "sent" : "logged";
    } else {
      const result = await getSmsProvider().send({ to: m.to, body: m.body });
      provider = result.provider;
      providerId = result.id;
      status = result.delivered ? "sent" : "logged";
    }
  } catch (err) {
    errorText = err instanceof Error ? err.message : String(err);
    console.error(`[notify] ${m.channel} to lead ${m.leadId ?? "-"} failed:`, errorText);
  }

  const row = {
    lead_id: m.leadId ?? null,
    booking_id: m.bookingId ?? null,
    customer_id: m.customerId ?? null,
    type: m.channel,
    direction: "outbound" as const,
    status,
    sender: m.channel === "email" ? env().EMAIL_FROM : "RTP Dhol Crew",
    recipient: m.to,
    subject,
    body: m.body,
    template_key: m.templateKey ?? null,
    provider,
    provider_message_id: providerId,
    error: errorText ?? null,
    ai_generation_id: m.aiGenerationId ?? null,
    automation_run_id: m.automationRunId ?? null,
    created_by: m.createdBy ?? null,
    sent_at: status === "failed" ? null : new Date().toISOString(),
    metadata: (m.attachments?.length ? { attachments: m.attachments.map((a) => a.filename) } : {}) as Json,
  };

  let messageId: string;
  if (m.draftMessageId) {
    const { error } = await db.from("messages").update(row).eq("id", m.draftMessageId);
    if (error) throw new Error(`Failed to update message log: ${error.message}`);
    messageId = m.draftMessageId;
  } else {
    const { data, error } = await db.from("messages").insert(row).select("id").single();
    if (error) throw new Error(`Failed to write message log: ${error.message}`);
    messageId = data.id;
  }
  if (status !== "failed" && m.leadId) {
    await db.from("leads").update({ last_contacted_at: new Date().toISOString() }).eq("id", m.leadId);
  }
  return { messageId, status, error: errorText };
}

/** Internal notification to the business (new lead, signed contract, payment…). */
export async function notifyAdmin(db: TypedSupabaseClient, subject: string, body: string, leadId?: string | null, url?: string) {
  const to = env().ADMIN_NOTIFICATION_EMAIL;
  if (!to) {
    await db.from("messages").insert({ lead_id: leadId ?? null, type: "system", direction: "internal", status: "logged", subject, body });
    return;
  }
  await sendMessage(db, {
    leadId,
    channel: "email",
    to,
    subject: `[RTP] ${subject}`,
    body,
    cta: url ? { label: "Open in dashboard", url } : undefined,
    templateKey: "admin.notification",
  });
}

/** Record a system/internal note on the lead's communication log. */
export async function logSystemMessage(db: TypedSupabaseClient, leadId: string | null, subject: string, body: string, metadata: Record<string, unknown> = {}) {
  const { error } = await db.from("messages").insert({
    lead_id: leadId,
    type: "system",
    direction: "internal",
    status: "logged",
    subject,
    body,
    metadata: metadata as Json,
  });
  if (error) console.error("[notify] failed to log system message", error.message);
}
