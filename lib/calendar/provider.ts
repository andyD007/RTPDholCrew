import "server-only";
import { createSign } from "node:crypto";
import { env, integrations } from "@/lib/env";
import { buildIcsEvent, type CalendarEventInput } from "./ics";

/**
 * Calendar integration boundary. The ICS provider works with no credentials
 * (downloadable .ics per booking + a private subscription feed). The Google
 * provider syncs confirmed bookings to a Google Calendar via a service account.
 */
export interface CalendarProvider {
  readonly name: string;
  upsertEvent(event: CalendarEventInput, externalId?: string | null): Promise<{ externalId: string | null }>;
  deleteEvent(externalId: string): Promise<void>;
}

class IcsCalendarProvider implements CalendarProvider {
  readonly name = "ics";
  async upsertEvent(event: CalendarEventInput) {
    // Nothing to push — the event is served from /api/calendar/feed and per-booking .ics downloads.
    void buildIcsEvent(event);
    return { externalId: null };
  }
  async deleteEvent() {}
}

class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "google";
  private token: { value: string; exp: number } | null = null;
  constructor(
    private calendarId: string,
    private clientEmail: string,
    private privateKey: string,
  ) {}

  private async accessToken(): Promise<string> {
    if (this.token && this.token.exp > Date.now() + 60_000) return this.token.value;
    const now = Math.floor(Date.now() / 1000);
    const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: this.clientEmail, scope: "https://www.googleapis.com/auth/calendar.events", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
    const signature = createSign("RSA-SHA256").update(unsigned).sign(this.privateKey).toString("base64url");
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    });
    const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
    if (!res.ok || !json.access_token) throw new Error(`Google auth failed: ${json.error_description ?? res.status}`);
    this.token = { value: json.access_token, exp: Date.now() + (json.expires_in ?? 3600) * 1000 };
    return json.access_token;
  }

  async upsertEvent(event: CalendarEventInput, externalId?: string | null) {
    const body = {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startsAt.toISOString() },
      end: { dateTime: event.endsAt.toISOString() },
      extendedProperties: { private: { rtpBookingUid: event.uid } },
    };
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events`;
    const res = await fetch(externalId ? `${base}/${encodeURIComponent(externalId)}` : base, {
      method: externalId ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${await this.accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || !json.id) throw new Error(`Google Calendar error: ${json.error?.message ?? res.status}`);
    return { externalId: json.id };
  }

  async deleteEvent(externalId: string) {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.calendarId)}/events/${encodeURIComponent(externalId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${await this.accessToken()}` },
    });
    if (!res.ok && res.status !== 410 && res.status !== 404) throw new Error(`Google Calendar delete failed: ${res.status}`);
  }
}

let provider: CalendarProvider | undefined;
export function getCalendarProvider(): CalendarProvider {
  if (provider) return provider;
  const e = env();
  provider = integrations().googleCalendar
    ? new GoogleCalendarProvider(e.GOOGLE_CALENDAR_ID!, e.GOOGLE_SERVICE_ACCOUNT_EMAIL!, e.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n"))
    : new IcsCalendarProvider();
  return provider;
}
