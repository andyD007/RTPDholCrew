import { describe, expect, it } from "vitest";
import {
  contentSuggestionSchema,
  customerResponseSchema,
  eventBriefSchema,
  leadIntakeSchema,
  quoteSuggestionSchema,
  RESPONSE_PURPOSES,
  reviewRequestSchema,
} from "@/lib/agents/types";
import { fallbackContent, fallbackCustomerResponse, fallbackEventBrief, fallbackLeadIntake, fallbackReview } from "@/lib/agents/fallbacks";
import type { LeadFacts } from "@/lib/agents/facts";
import { jsonSchemaFor } from "@/lib/ai/provider";
import { suggestPrice } from "@/lib/quotes/pricing";

const facts: LeadFacts = {
  reference: "RTP-L-2026-0007",
  status: "new",
  customer: { firstName: "Harpreet", lastName: "Singh" },
  eventType: "Baraat",
  eventTitle: "Singh Baraat",
  date: "Saturday, October 10, 2026",
  dayOfWeek: "Saturday",
  daysUntilEvent: 14,
  timeWindow: "5:30 PM – 6:15 PM",
  duration: "45 min",
  venue: "Downtown Raleigh Marriott, Raleigh, NC",
  venueName: "Downtown Raleigh Marriott",
  city: "Raleigh",
  streetKnown: false,
  setting: "outdoor",
  parkingNotes: null,
  guestCount: null,
  service: "Solo Dhol Player",
  performers: 1,
  planner: null,
  customerMessage: "Not sure yet where exactly it starts.",
  specialInstructions: null,
  entranceInstructions: null,
  specialSongs: null,
  availability: { status: "manual_review", summary: "inside the travel buffer of a confirmed booking" },
  quote: null,
  contractStatus: null,
  payment: { total: "$0.00", paid: "$0.00", balance: "$0.00", depositPaid: false },
};

describe("agent structured outputs", () => {
  it("lead intake fallback satisfies the schema and spots the Baraat start location", () => {
    const out = leadIntakeSchema.parse(fallbackLeadIntake(facts));
    expect(out.headline).toBe("Singh Baraat");
    expect(out.missingInformation).toContain("Exact Baraat starting location");
    expect(out.urgency).toBe("urgent");
    expect(out.risks.join(" ")).toMatch(/timing conflict/);
    expect(out.recommendedAction).toMatch(/schedule conflict/);
  });

  it("every customer-response purpose produces a valid email and SMS draft", () => {
    for (const purpose of RESPONSE_PURPOSES) {
      const email = customerResponseSchema.parse(fallbackCustomerResponse(purpose, "email", facts, { portal: "https://x/portal/t", quote: "https://x/quote/t", contract: "https://x/contract/t" }));
      expect(email.subject).toBeTruthy();
      expect(email.body).toContain("Harpreet");
      expect(email.containsCommitments).toBe(false);
      const sms = customerResponseSchema.parse(fallbackCustomerResponse(purpose, "sms", facts, { portal: "https://x/p" }));
      expect(sms.subject).toBeNull();
      expect(sms.body.length).toBeLessThanOrEqual(320);
    }
  });

  it("never tells a customer they're unavailable in the availability response", () => {
    const out = fallbackCustomerResponse("availability_response", "email", { ...facts, availability: { status: "unavailable", summary: "overlap" } }, {});
    expect(out.body).not.toMatch(/unavailable|not available|can't|cannot/i);
    expect(out.body).toMatch(/options/);
  });

  it("event brief, content and review fallbacks satisfy their schemas", () => {
    const brief = eventBriefSchema.parse(fallbackEventBrief(facts, ["Horse arrives 3:45"]));
    expect(brief.watchOuts.join(" ")).toMatch(/rain/);
    expect(brief.logistics.join(" ")).toMatch(/Horse/);
    const content = contentSuggestionSchema.parse(fallbackContent({ title: "Singh Baraat", eventType: "Baraat", city: "Durham" }));
    expect(content.hashtags.every((h) => /^#[A-Za-z0-9_]+$/.test(h))).toBe(true);
    expect(content.altText.length).toBeLessThanOrEqual(250);
    const review = reviewRequestSchema.parse(fallbackReview(facts, { google: "https://g.page/r/x" }));
    expect(review.askForGoogleReview).toBe(true);
    expect(review.thankYouBody).toContain("https://g.page/r/x");
  });

  it("rejects malformed model output", () => {
    expect(leadIntakeSchema.safeParse({ headline: "x" }).success).toBe(false);
    expect(leadIntakeSchema.safeParse({ ...fallbackLeadIntake(facts), urgency: "extreme" }).success).toBe(false);
    expect(customerResponseSchema.safeParse({ channel: "fax", subject: null, body: "hello there", tone: "warm", containsCommitments: false }).success).toBe(false);
    expect(contentSuggestionSchema.safeParse({ ...fallbackContent({ title: "t", eventType: null, city: null }), hashtags: ["no-hash"] }).success).toBe(false);
    expect(quoteSuggestionSchema.safeParse({ suggestedTotalCents: -5 }).success).toBe(false);
  });

  it("schemas contain no action fields (agents can't charge, refund, sign or cancel)", () => {
    for (const schema of [leadIntakeSchema, customerResponseSchema, quoteSuggestionSchema, eventBriefSchema, contentSuggestionSchema, reviewRequestSchema]) {
      const json = JSON.stringify(jsonSchemaFor(schema)).toLowerCase();
      for (const forbidden of ["refund", "charge", "cancelbooking", "sign_contract", "setprice", "finalprice"]) expect(json).not.toContain(forbidden);
    }
  });

  it("produces JSON Schema usable as a tool input schema", () => {
    const s = jsonSchemaFor(leadIntakeSchema);
    expect(s.type).toBe("object");
    expect(s).not.toHaveProperty("$schema");
    expect((s.required as string[]).sort()).toEqual(["headline", "missingInformation", "recommendedAction", "risks", "summaryLines", "urgency", "urgencyReason"].sort());
  });
});

describe("quote assistant pricing", () => {
  const rules = { travelFreeRadiusMiles: 25, travelPerMileCents: 150, weekendPremiumPercent: 10, peakSeasonMonths: [4, 5, 9, 10, 11], peakSeasonPremiumPercent: 10, lastMinuteDays: 14, lastMinutePremiumPercent: 10, additionalPerformerPercent: 80 };
  const base = { serviceName: "Wedding Baraat", basePriceCents: 50000, includedMinutes: 60, extraHourCents: 20000, servicePerformers: 1, requestedPerformers: 1, durationMinutes: 60, eventDate: "2026-07-15", today: "2026-03-01", travelMiles: 10, rules };

  it("suggests base price with no premiums on a Wednesday in July nearby", () => {
    const s = quoteSuggestionSchema.parse(suggestPrice(base));
    expect(s.suggestedTotalCents).toBe(50000);
    expect(s.confidence).toBe("high");
  });

  it("adds extra time, a second player, date premiums and travel with explained factors", () => {
    const s = suggestPrice({ ...base, durationMinutes: 90, requestedPerformers: 2, eventDate: "2026-10-10", today: "2026-10-01", travelMiles: 45 });
    const labels = s.factors.map((f) => f.label);
    expect(labels).toEqual(expect.arrayContaining(["Extended duration", "Additional performer", "Weekend", "Peak season", "Short notice", "Travel"]));
    // 500 + 100 (0.5h) + 400 (80% of 500) = 1000; +30% = 300 → 1300; travel (45-25)*2*1.50 = 60 → 1360
    expect(s.suggestedTotalCents).toBe(136000);
    expect(s.travelFeeCents).toBe(6000);
  });

  it("lowers confidence when inputs are missing", () => {
    expect(suggestPrice({ ...base, travelMiles: null }).confidence).toBe("medium");
    expect(suggestPrice({ ...base, basePriceCents: null, includedMinutes: null }).confidence).toBe("low");
  });
});
