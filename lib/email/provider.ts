import "server-only";
import { Resend } from "resend";
import { env, integrations } from "@/lib/env";

export type EmailAttachment = { filename: string; content: Buffer; contentType?: string };

export type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  tags?: { name: string; value: string }[];
};

export type SendResult = { provider: string; id: string; delivered: boolean };

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<SendResult>;
}

class ResendProvider implements EmailProvider {
  readonly name = "resend";
  private client: Resend;
  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }
  async send(m: EmailMessage): Promise<SendResult> {
    const e = env();
    const { data, error } = await this.client.emails.send({
      from: e.EMAIL_FROM,
      to: m.to,
      subject: m.subject,
      text: m.text,
      html: m.html,
      replyTo: m.replyTo ?? e.EMAIL_REPLY_TO,
      attachments: m.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
      tags: m.tags,
    });
    if (error || !data) throw new Error(`Resend error: ${error?.message ?? "unknown"}`);
    return { provider: this.name, id: data.id, delivered: true };
  }
}

/** Development fallback: nothing leaves the server; the message is only logged in the CRM. */
class LogEmailProvider implements EmailProvider {
  readonly name = "log";
  async send(m: EmailMessage): Promise<SendResult> {
    console.info(`[email:log] → ${Array.isArray(m.to) ? m.to.join(", ") : m.to} | ${m.subject}`);
    return { provider: this.name, id: `log_${Date.now().toString(36)}`, delivered: false };
  }
}

let provider: EmailProvider | undefined;
export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  const key = env().RESEND_API_KEY;
  provider = integrations().email && key ? new ResendProvider(key) : new LogEmailProvider();
  return provider;
}

/** Test hook. */
export function setEmailProvider(p: EmailProvider | undefined) {
  provider = p;
}
