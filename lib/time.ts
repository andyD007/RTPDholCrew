import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";

export const BUSINESS_TZ = process.env.NEXT_PUBLIC_BUSINESS_TIMEZONE || "America/New_York";

/** Parse "HH:MM" or "HH:MM:SS" into minutes after midnight. */
export function timeToMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
  if (!m) throw new Error(`Invalid time: ${time}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new Error(`Invalid time: ${time}`);
  return h * 60 + min;
}

export function minutesToTime(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Convert a local business date + time to an absolute Date (UTC instant). */
export function localToUtc(date: string, time: string, tz = BUSINESS_TZ): Date {
  const hhmm = minutesToTime(timeToMinutes(time));
  return fromZonedTime(`${date}T${hhmm}:00`, tz);
}

/** Start/end instants for an event given local date, start time and duration. */
export function eventWindow(date: string, startTime: string, durationMinutes: number, tz = BUSINESS_TZ) {
  const startsAt = localToUtc(date, startTime, tz);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  const endTime = formatInTimeZone(endsAt, tz, "HH:mm");
  return { startsAt, endsAt, endTime };
}

/** Duration in minutes between two local times; rolls over midnight. */
export function durationBetween(startTime: string, endTime: string): number {
  const diff = timeToMinutes(endTime) - timeToMinutes(startTime);
  return diff > 0 ? diff : diff + 1440;
}

export function formatEventDate(date: string | Date, tz = BUSINESS_TZ): string {
  const d = typeof date === "string" ? fromZonedTime(`${date}T12:00:00`, tz) : date;
  return formatInTimeZone(d, tz, "EEEE, MMMM d, yyyy");
}

export function formatShortDate(date: string | Date, tz = BUSINESS_TZ): string {
  const d = typeof date === "string" ? fromZonedTime(`${date}T12:00:00`, tz) : date;
  return formatInTimeZone(d, tz, "MMM d, yyyy");
}

export function formatTime12(time: string): string {
  const mins = timeToMinutes(time);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatTimeRange(startTime: string, endTime?: string | null): string {
  return endTime ? `${formatTime12(startTime)} – ${formatTime12(endTime)}` : formatTime12(startTime);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} ${h === 1 ? "hour" : "hours"}`;
  return `${m} min`;
}

export function formatDateTime(value: string | Date, tz = BUSINESS_TZ): string {
  return formatInTimeZone(new Date(value), tz, "MMM d, yyyy h:mm a");
}

/** Today's date (YYYY-MM-DD) in the business time zone. */
export function todayLocal(now = new Date(), tz = BUSINESS_TZ): string {
  return formatInTimeZone(now, tz, "yyyy-MM-dd");
}

export function addDaysLocal(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export { toZonedTime, formatInTimeZone };
