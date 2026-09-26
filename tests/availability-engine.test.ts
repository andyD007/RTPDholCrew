import { describe, expect, it } from "vitest";
import { evaluateAvailability, gapBetween, type Commitment } from "@/lib/availability/engine";
import { eventWindow } from "@/lib/time";

const win = (date: string, start: string, minutes: number) => {
  const w = eventWindow(date, start, minutes);
  return { startsAt: w.startsAt, endsAt: w.endsAt, localDate: date };
};

const booking = (id: string, date: string, start: string, minutes: number, buffer = 60): Commitment => ({
  id,
  kind: "booking",
  label: id,
  travelBufferMinutes: buffer,
  ...win(date, start, minutes),
});

describe("gapBetween", () => {
  it("is positive for separated windows and negative for overlaps", () => {
    const a = win("2026-10-10", "16:00", 60);
    expect(gapBetween(a, win("2026-10-10", "18:00", 30))).toBe(60);
    expect(gapBetween(a, win("2026-10-10", "13:00", 60))).toBe(120);
    expect(gapBetween(a, win("2026-10-10", "16:30", 60))).toBe(-30);
    expect(gapBetween(a, win("2026-10-10", "17:00", 30))).toBe(0);
  });
});

describe("evaluateAvailability", () => {
  const confirmed = booking("Example Wedding Baraat", "2026-10-10", "16:00", 60);

  it("returns AVAILABLE when nothing is nearby", () => {
    const r = evaluateAvailability({ ...win("2026-10-11", "16:00", 60), travelBufferMinutes: 60 }, [confirmed]);
    expect(r.status).toBe("available");
    expect(r.conflicts).toHaveLength(0);
  });

  it("returns UNAVAILABLE on a clear overlap with a confirmed booking", () => {
    const r = evaluateAvailability({ ...win("2026-10-10", "16:30", 45), travelBufferMinutes: 60 }, [confirmed]);
    expect(r.status).toBe("unavailable");
    expect(r.conflicts[0]).toMatchObject({ reason: "overlap", severity: "unavailable", gapMinutes: -30 });
  });

  it("returns MANUAL_REVIEW inside the travel buffer (the seeded Singh/Example scenario)", () => {
    // Confirmed 4:00–5:00 PM Durham; new request 5:30 PM Raleigh → 30 min apart, buffer 60.
    const r = evaluateAvailability({ ...win("2026-10-10", "17:30", 45), travelBufferMinutes: 60 }, [confirmed]);
    expect(r.status).toBe("manual_review");
    expect(r.conflicts[0]).toMatchObject({ reason: "travel_buffer", gapMinutes: 30 });
    expect(r.summary).toMatch(/travel buffer/);
  });

  it("flags a tight turnaround just outside the buffer", () => {
    const r = evaluateAvailability({ ...win("2026-10-10", "18:15", 45), travelBufferMinutes: 60 }, [confirmed]);
    expect(r.status).toBe("manual_review");
    expect(r.conflicts[0].reason).toBe("tight_turnaround");
    const clear = evaluateAvailability({ ...win("2026-10-10", "18:31", 45), travelBufferMinutes: 60 }, [confirmed]);
    expect(clear.status).toBe("available");
  });

  it("uses the larger of the two travel buffers", () => {
    const farAway = booking("Far venue", "2026-10-10", "12:00", 60, 150);
    const r = evaluateAvailability({ ...win("2026-10-10", "15:00", 60), travelBufferMinutes: 30 }, [farAway]);
    expect(r.status).toBe("manual_review"); // 120 min apart < 150 min buffer
  });

  it("treats pending holds as manual review, never unavailable", () => {
    const hold: Commitment = { ...booking("Pending quote", "2026-10-10", "16:00", 60), kind: "hold" };
    const r = evaluateAvailability({ ...win("2026-10-10", "16:00", 60), travelBufferMinutes: 60 }, [hold]);
    expect(r.status).toBe("manual_review");
    expect(r.conflicts[0].reason).toBe("soft_hold");
  });

  it("blocks blackout periods", () => {
    const block: Commitment = { id: "vacation", kind: "block", label: "Vacation", travelBufferMinutes: 0, ...win("2026-12-24", "00:00", 24 * 60 - 1) };
    expect(evaluateAvailability({ ...win("2026-12-24", "18:00", 60), travelBufferMinutes: 60 }, [block]).status).toBe("unavailable");
  });

  it("applies the daily event limit", () => {
    const day = "2026-11-14";
    const existing = [booking("A", day, "09:00", 30), booking("B", day, "12:00", 30), booking("C", day, "15:00", 30)];
    const r = evaluateAvailability({ ...win(day, "20:00", 30), travelBufferMinutes: 60 }, existing, { manualReviewGapMinutes: 30, maxEventsPerDay: 3 });
    expect(r.status).toBe("manual_review");
    expect(r.conflicts.some((c) => c.reason === "daily_limit")).toBe(true);
  });

  it("worst severity wins", () => {
    const hold: Commitment = { ...booking("Hold", "2026-10-10", "19:00", 60), kind: "hold" };
    const r = evaluateAvailability({ ...win("2026-10-10", "16:30", 60), travelBufferMinutes: 60 }, [confirmed, hold]);
    expect(r.status).toBe("unavailable");
  });

  it("rejects an invalid candidate", () => {
    const w = win("2026-10-10", "16:00", 60);
    expect(() => evaluateAvailability({ startsAt: w.endsAt, endsAt: w.startsAt, travelBufferMinutes: 0 }, [])).toThrow();
  });

  it("handles events that cross midnight", () => {
    const late = booking("Late reception", "2026-10-10", "23:00", 120);
    const r = evaluateAvailability({ ...win("2026-10-11", "00:30", 30), travelBufferMinutes: 60 }, [late]);
    expect(r.status).toBe("unavailable");
  });
});
