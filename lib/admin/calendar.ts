/** Calendar grid helpers (pure). Dates are YYYY-MM-DD strings in business time. */
import { addDaysLocal } from "@/lib/time";

const dow = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Sunday

export function startOfWeek(date: string): string {
  return addDaysLocal(date, -dow(date));
}

export function monthGrid(anchor: string): string[][] {
  const first = `${anchor.slice(0, 7)}-01`;
  let cursor = startOfWeek(first);
  const month = anchor.slice(0, 7);
  const weeks: string[][] = [];
  do {
    const week = Array.from({ length: 7 }, (_, i) => addDaysLocal(cursor, i));
    weeks.push(week);
    cursor = addDaysLocal(cursor, 7);
  } while (cursor.slice(0, 7) === month);
  return weeks;
}

export function weekDays(anchor: string): string[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDaysLocal(start, i));
}

export function shiftMonth(anchor: string, delta: number): string {
  const [y, m] = anchor.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
  return d.toISOString().slice(0, 10);
}
