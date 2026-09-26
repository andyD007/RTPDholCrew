import "server-only";
import { env, integrations } from "@/lib/env";

export type SmsMessage = { to: string; body: string };
export type SmsResult = { provider: string; id: string; delivered: boolean };

/** Provider abstraction so Twilio can be swapped (MessageBird, Vonage…) without touching callers. */
export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<SmsResult>;
}

/** Twilio via its REST API (no SDK needed — keeps the server bundle small). */
class TwilioProvider implements SmsProvider {
  readonly name = "twilio";
  constructor(
    private sid: string,
    private token: string,
    private from?: string,
    private messagingServiceSid?: string,
  ) {}
  async send({ to, body }: SmsMessage): Promise<SmsResult> {
    const params = new URLSearchParams({ To: to, Body: body });
    if (this.messagingServiceSid) params.set("MessagingServiceSid", this.messagingServiceSid);
    else if (this.from) params.set("From", this.from);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.sid}:${this.token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string; code?: number };
    if (!res.ok || !json.sid) throw new Error(`Twilio error ${res.status}: ${json.message ?? "unknown"}`);
    return { provider: this.name, id: json.sid, delivered: true };
  }
}

class LogSmsProvider implements SmsProvider {
  readonly name = "log";
  async send({ to, body }: SmsMessage): Promise<SmsResult> {
    console.info(`[sms:log] → ${to} | ${body.slice(0, 80)}`);
    return { provider: this.name, id: `log_${Date.now().toString(36)}`, delivered: false };
  }
}

let provider: SmsProvider | undefined;
export function getSmsProvider(): SmsProvider {
  if (provider) return provider;
  const e = env();
  provider =
    integrations().sms && e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN
      ? new TwilioProvider(e.TWILIO_ACCOUNT_SID, e.TWILIO_AUTH_TOKEN, e.TWILIO_FROM_NUMBER, e.TWILIO_MESSAGING_SERVICE_SID)
      : new LogSmsProvider();
  return provider;
}

export function setSmsProvider(p: SmsProvider | undefined) {
  provider = p;
}
