/** RFC 5545 iCalendar generation (pure, unit tested). */
export type CalendarEventInput = {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startsAt: Date;
  endsAt: Date;
  url?: string;
  updatedAt?: Date;
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
};

const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines at 75 octets as required by RFC 5545. */
export function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const ch of line) {
    if (Buffer.byteLength(current + ch, "utf8") > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = ch;
    } else current += ch;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcsEvent(e: CalendarEventInput): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${fmt(e.updatedAt ?? new Date())}`,
    `DTSTART:${fmt(e.startsAt)}`,
    `DTEND:${fmt(e.endsAt)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${escapeIcs(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${escapeIcs(e.location)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    `STATUS:${e.status ?? "CONFIRMED"}`,
    "END:VEVENT",
  ];
}

export function buildIcsCalendar(events: CalendarEventInput[], name = "RTP Dhol Crew"): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RTP Dhol Crew//Bookings//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escapeIcs(name)}`, ...events.flatMap(buildIcsEvent), "END:VCALENDAR"];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
