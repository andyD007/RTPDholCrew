/** Pure dashboard aggregations (unit tested). */
import { formatInTimeZone } from "date-fns-tz";

export type MonthPoint = { month: string; label: string; value: number };

/** Last N calendar months (business TZ), oldest first, zero-filled. */
export function monthBuckets(now: Date, months: number, tz: string): MonthPoint[] {
  const out: MonthPoint[] = [];
  const [y, m] = formatInTimeZone(now, tz, "yyyy-MM").split("-").map(Number);
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 15));
    const key = d.toISOString().slice(0, 7);
    out.push({ month: key, label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), value: 0 });
  }
  return out;
}

export function sumByMonth(rows: { at: string | null; value: number }[], buckets: MonthPoint[], tz: string): MonthPoint[] {
  const map = new Map(buckets.map((b) => [b.month, { ...b }]));
  for (const r of rows) {
    if (!r.at) continue;
    const key = formatInTimeZone(new Date(r.at), tz, "yyyy-MM");
    const b = map.get(key);
    if (b) b.value += r.value;
  }
  return [...map.values()];
}

const WON = new Set(["deposit_paid", "confirmed", "completed"]);
const CLOSED_LOST = new Set(["lost", "cancelled"]);

/** Conversion = won ÷ decided (won + lost/cancelled). Open leads are excluded until they resolve. */
export function conversionRate(statuses: string[]): { rate: number | null; won: number; decided: number; total: number } {
  const won = statuses.filter((s) => WON.has(s)).length;
  const lost = statuses.filter((s) => CLOSED_LOST.has(s)).length;
  const decided = won + lost;
  return { rate: decided ? won / decided : null, won, decided, total: statuses.length };
}
