import { describe, expect, it } from "vitest";
import {
  applyQuietHours,
  checkConditions,
  computeScheduledFor,
  dedupeKey,
  retryDelayMinutes,
  throttleDecision,
} from "@/lib/automation/scheduling";
import { classifyFollowUp, type FollowUpCandidate } from "@/lib/agents/follow-up-rules";
import { automationRules, messageTemplates } from "@/lib/content/catalog";

const TZ = "America/New_York";
const rule = (key: string) => {
  const r = automationRules.find((x) => x.key === key)!;
  return { key: r.key, trigger_event: r.triggerEvent, delay_minutes: r.delayMinutes, channel: r.channel, conditions: r.conditions ?? {} };
};

describe("computeScheduledFor", () => {
  const occurredAt = new Date("2026-09-26T15:00:00Z");
  const eventStartsAt = new Date("2026-10-10T20:00:00Z");

  it("schedules trigger-relative rules after the trigger", () => {
    expect(computeScheduledFor(rule("quote.not_viewed"), { occurredAt })?.toISOString()).toBe("2026-09-29T15:00:00.000Z");
    expect(computeScheduledFor(rule("lead.auto_reply"), { occurredAt })?.toISOString()).toBe(occurredAt.toISOString());
  });

  it("schedules event-relative rules before the event start", () => {
    expect(computeScheduledFor(rule("event.seven_day"), { occurredAt, eventStartsAt })?.toISOString()).toBe("2026-10-03T20:00:00.000Z");
    expect(computeScheduledFor(rule("event.day_before"), { occurredAt, eventStartsAt })?.toISOString()).toBe("2026-10-09T20:00:00.000Z");
    expect(computeScheduledFor(rule("event.day_before"), { occurredAt })).toBeNull();
  });

  it("builds stable dedupe keys", () => {
    expect(dedupeKey("quote.not_viewed", "lead-1", "evt-9")).toBe("quote.not_viewed:lead-1:evt-9");
    expect(dedupeKey("x", null, "a")).toBe("x:none:a");
  });
});

describe("quiet hours", () => {
  const limits = { quietHoursStart: 21, quietHoursEnd: 8 };
  it("defers late-evening sends to 8am the next morning (Eastern)", () => {
    const at = new Date("2026-10-06T02:30:00Z"); // 10:30 PM EDT on Oct 5
    expect(applyQuietHours(at, limits, TZ).toISOString()).toBe("2026-10-06T12:00:00.000Z"); // 8:00 AM EDT
  });
  it("defers early-morning sends to 8am the same day", () => {
    const at = new Date("2026-10-06T09:00:00Z"); // 5:00 AM EDT
    expect(applyQuietHours(at, limits, TZ).toISOString()).toBe("2026-10-06T12:00:00.000Z");
  });
  it("leaves daytime sends alone and handles EST after DST ends", () => {
    const at = new Date("2026-10-06T16:00:00Z"); // noon EDT
    expect(applyQuietHours(at, limits, TZ)).toBe(at);
    const winter = new Date("2026-12-01T03:00:00Z"); // 10 PM EST
    expect(applyQuietHours(winter, limits, TZ).toISOString()).toBe("2026-12-01T13:00:00.000Z"); // 8 AM EST
  });
  it("is a no-op when start equals end", () => {
    const at = new Date("2026-10-06T02:30:00Z");
    expect(applyQuietHours(at, { quietHoursStart: 0, quietHoursEnd: 0 }, TZ)).toBe(at);
  });
});

describe("conditions & throttling", () => {
  it("re-checks conditions against the current state", () => {
    expect(checkConditions({ quoteStatusIn: ["sent"] }, { quoteStatus: "sent" })).toEqual({ ok: true });
    const res = checkConditions({ quoteStatusIn: ["sent"] }, { quoteStatus: "accepted" });
    expect(res.ok).toBe(false);
    expect(checkConditions({ bookingStatusIn: ["confirmed"] }, { bookingStatus: null }).ok).toBe(false);
    expect(checkConditions({}, {}).ok).toBe(true);
    expect(checkConditions(null, {}).ok).toBe(true);
  });

  it("caps non-transactional messages per day but never blocks transactional ones", () => {
    expect(throttleDecision(1, { maxMessagesPerLeadPerDay: 2 }, "quote.not_viewed")).toBe("send");
    expect(throttleDecision(2, { maxMessagesPerLeadPerDay: 2 }, "quote.not_viewed")).toBe("defer");
    expect(throttleDecision(5, { maxMessagesPerLeadPerDay: 2 }, "booking.confirmation")).toBe("send");
    expect(throttleDecision(5, { maxMessagesPerLeadPerDay: 2 }, "lead.auto_reply")).toBe("send");
  });

  it("backs off retries", () => {
    expect([0, 1, 2, 9].map(retryDelayMinutes)).toEqual([5, 30, 120, 120]);
  });

  it("only auto-sends templates that are explicitly approved", () => {
    // Sanity check on the default catalog: every auto-send rule's template must allow it.
    for (const r of automationRules.filter((x) => x.autoSend && (x.channel === "email" || x.channel === "sms"))) {
      const t = messageTemplates.find((m) => m.key === r.templateKey);
      expect(t?.autoSendAllowed, `${r.key} → ${r.templateKey}`).toBe(true);
      expect(t?.channel).toBe(r.channel);
    }
  });
});

describe("follow-up agent rules", () => {
  const now = new Date("2026-09-26T16:00:00Z");
  const base: FollowUpCandidate = {
    leadId: "l1",
    reference: "RTP-L-1",
    name: "A B",
    eventTitle: "Event",
    eventStartsAt: "2026-11-20T20:00:00Z",
    status: "quote_sent",
    createdAt: "2026-09-01T00:00:00Z",
    lastContactedAt: "2026-09-20T00:00:00Z",
    quote: null,
    contract: null,
    booking: null,
  };
  it("flags unanswered new leads after 4 hours", () => {
    expect(classifyFollowUp({ ...base, status: "new", lastContactedAt: null, createdAt: "2026-09-26T10:00:00Z" }, now)?.action).toBe("respond_to_new_lead");
    expect(classifyFollowUp({ ...base, status: "new", lastContactedAt: null, createdAt: "2026-09-26T14:00:00Z" }, now)).toBeNull();
  });
  it("follows up on unopened and opened quotes", () => {
    expect(classifyFollowUp({ ...base, quote: { status: "sent", sentAt: "2026-09-22T00:00:00Z", viewedAt: null } }, now)?.reason).toMatch(/not opened/);
    expect(classifyFollowUp({ ...base, quote: { status: "sent", sentAt: "2026-09-25T00:00:00Z", viewedAt: null } }, now)).toBeNull();
    expect(classifyFollowUp({ ...base, quote: { status: "viewed", sentAt: "2026-09-20T00:00:00Z", viewedAt: "2026-09-23T00:00:00Z" } }, now)?.reason).toMatch(/viewed/);
  });
  it("reminds about unsigned contracts and unpaid deposits", () => {
    expect(classifyFollowUp({ ...base, contract: { status: "sent", sentAt: "2026-09-20T00:00:00Z" } }, now)?.action).toBe("send_contract_reminder");
    expect(classifyFollowUp({ ...base, contract: { status: "signed", sentAt: "2026-09-20T00:00:00Z" }, booking: { status: "pending", totalCents: 500, paidCents: 0, depositCents: 150 } }, now)?.action).toBe("send_deposit_reminder");
  });
  it("prompts balance collection and confirmation for events within a week", () => {
    const soon = { ...base, eventStartsAt: "2026-09-30T20:00:00Z" };
    expect(classifyFollowUp({ ...soon, booking: { status: "confirmed", totalCents: 500, paidCents: 150, depositCents: 150 } }, now)?.action).toBe("collect_balance");
    expect(classifyFollowUp({ ...soon, booking: { status: "confirmed", totalCents: 500, paidCents: 500, depositCents: 150 } }, now)?.action).toBe("confirm_event_details");
  });
  it("ignores past events", () => {
    expect(classifyFollowUp({ ...base, eventStartsAt: "2026-09-20T20:00:00Z", status: "new", lastContactedAt: null }, now)).toBeNull();
  });
});
