import { describe, expect, it } from "vitest";
import { cleanLine, cleanText, escapeHtml, normalizePhone } from "@/lib/security/sanitize";
import { generateAccessToken, hashToken, isWellFormedToken, createSignedValue, verifySignedValue } from "@/lib/security/tokens";
import { memoryLimit } from "@/lib/security/rate-limit";
import { hasRole } from "@/lib/auth/admin";
import { availabilityRequestSchema, stepSchemas, validateEventDate } from "@/lib/validation/booking";
import { buildIcsCalendar, escapeIcs, foldLine } from "@/lib/calendar/ics";
import { renderEmailHtml } from "@/lib/email/layout";
import { conversionRate, monthBuckets, sumByMonth } from "@/lib/admin/metrics";
import { monthGrid } from "@/lib/admin/calendar";
import { toWinAnsi } from "@/lib/pdf/document";
import { dollarsToCents, formatMoney } from "@/lib/money";
import { eventWindow } from "@/lib/time";

describe("authorization roles", () => {
  it("ranks owner > admin > staff", () => {
    expect(hasRole("owner", "admin")).toBe(true);
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("staff", "admin")).toBe(false);
    expect(hasRole("admin", "owner")).toBe(false);
    expect(hasRole("staff", "staff")).toBe(true);
  });
});

describe("magic-link tokens", () => {
  it("are 256-bit random, stored hashed", () => {
    const a = generateAccessToken();
    const b = generateAccessToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.hash).toBe(hashToken(a.token));
    expect(a.hash).not.toContain(a.token);
    expect(isWellFormedToken(a.token)).toBe(true);
    expect(isWellFormedToken("../../etc")).toBe(false);
    expect(isWellFormedToken("a'; drop table")).toBe(false);
  });
  it("signed values verify and expire", () => {
    const v = createSignedValue("feed", 60);
    expect(verifySignedValue(v)).toBe("feed");
    expect(verifySignedValue(v.replace(/.$/, "x"))).toBeNull();
    expect(verifySignedValue(createSignedValue("feed", -1))).toBeNull();
  });
});

describe("sanitization", () => {
  it("strips tags and control characters, caps length", () => {
    expect(cleanText("Hi <b>there</b>\u0000 <script>x</script>")).toBe("Hi there x");
    expect(cleanLine("  a \n  b  ")).toBe("a b");
    expect(cleanText("x".repeat(50), 10)).toHaveLength(10);
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
  it("normalises US phone numbers", () => {
    expect(normalizePhone("(919) 555-0142")).toBe("+19195550142");
    expect(normalizePhone("1-919-555-0142")).toBe("+19195550142");
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
  });
  it("email HTML escapes user content", () => {
    const html = renderEmailHtml({ subject: "S", body: "Hello <img src=x onerror=alert(1)>\n\nVisit https://example.com/a?b=1" });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain('<a href="https://example.com/a?b=1"');
  });
});

describe("rate limiting (memory fallback)", () => {
  it("allows N per window then blocks, and resets", () => {
    const key = `t-${Math.random()}`;
    const t0 = 1_000_000;
    expect([1, 2, 3, 4].map(() => memoryLimit(key, 3, 60, t0).ok)).toEqual([true, true, true, false]);
    expect(memoryLimit(key, 3, 60, t0 + 61_000).ok).toBe(true);
  });
});

describe("lead submission validation", () => {
  const valid = {
    eventType: "baraat",
    eventDate: "2026-10-10",
    startTime: "16:00",
    durationMinutes: 60,
    venueName: "Sample Estate",
    city: "Durham",
    state: "NC",
    postalCode: "27705",
    service: "wedding-baraat",
    firstName: "Example",
    lastName: "Client",
    email: "EXAMPLE@Example.com ",
    phone: "(919) 555-0101",
    guestCount: "",
  };
  it("accepts a complete request and normalises fields", () => {
    const r = availabilityRequestSchema.parse(valid);
    expect(r.email).toBe("example@example.com");
    expect(r.guestCount).toBeUndefined();
    expect(r.plannerEmail).toBeUndefined();
  });
  it("rejects bad input with field-level errors", () => {
    const r = availabilityRequestSchema.safeParse({ ...valid, email: "nope", phone: "123", startTime: "25:00", postalCode: "abc", state: "North Carolina" });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["email", "phone", "startTime", "postalCode", "state"]));
  });
  it("requires a description for custom services", () => {
    expect(availabilityRequestSchema.safeParse({ ...valid, service: "custom" }).success).toBe(false);
    expect(availabilityRequestSchema.safeParse({ ...valid, service: "custom", customService: "Dhol + dancers" }).success).toBe(true);
    expect(stepSchemas.service.safeParse({ service: "custom", customService: "" }).success).toBe(false);
  });
  it("rejects filled honeypots", () => {
    expect(availabilityRequestSchema.safeParse({ ...valid, website: "spam.example" }).success).toBe(false);
  });
  it("validates the date window", () => {
    expect(validateEventDate("2026-09-25", "2026-09-26")).toMatch(/passed/);
    expect(validateEventDate("2030-01-01", "2026-09-26")).toMatch(/3 years/);
    expect(validateEventDate("2026-09-26", "2026-09-26")).toBeNull();
  });
});

describe("calendar (ICS)", () => {
  it("escapes, folds and wraps events", () => {
    expect(escapeIcs("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const long = `DESCRIPTION:${"x".repeat(200)}`;
    expect(foldLine(long).split("\r\n ").every((l) => Buffer.byteLength(l) <= 75)).toBe(true);
    const w = eventWindow("2026-10-10", "16:00", 60);
    const ics = buildIcsCalendar([{ uid: "u1@rtp", title: "Baraat, Durham", startsAt: w.startsAt, endsAt: w.endsAt, location: "Sample Estate" }]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART:20261010T200000Z");
    expect(ics).toContain("SUMMARY:Baraat\\, Durham");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("dashboard metrics & calendar grid", () => {
  it("buckets revenue by month in business time", () => {
    const now = new Date("2026-09-26T16:00:00Z");
    const buckets = monthBuckets(now, 3, "America/New_York");
    expect(buckets.map((b) => b.month)).toEqual(["2026-07", "2026-08", "2026-09"]);
    // 2026-09-01T02:00Z is still Aug 31 in New York.
    const s = sumByMonth([{ at: "2026-09-01T02:00:00Z", value: 100 }, { at: "2026-09-10T12:00:00Z", value: 50 }, { at: null, value: 999 }], buckets, "America/New_York");
    expect(s.map((b) => b.value)).toEqual([0, 100, 50]);
  });
  it("computes conversion over decided leads", () => {
    expect(conversionRate(["confirmed", "completed", "lost", "new", "quote_sent"])).toEqual({ rate: 2 / 3, won: 2, decided: 3, total: 5 });
    expect(conversionRate(["new"]).rate).toBeNull();
  });
  it("builds full-week month grids", () => {
    const g = monthGrid("2026-10-15");
    expect(g[0][0]).toBe("2026-09-27");
    expect(g.at(-1)!.at(-1)).toBe("2026-10-31");
    expect(g.every((w) => w.length === 7)).toBe(true);
  });
});

describe("money & PDF text", () => {
  it("formats and parses money", () => {
    expect(formatMoney(50000)).toBe("$500");
    expect(formatMoney(11250)).toBe("$112.50");
    expect(formatMoney(null)).toBe("$0");
    expect(dollarsToCents("$1,250.50")).toBe(125050);
    expect(() => dollarsToCents("abc")).toThrow();
  });
  it("maps text to WinAnsi for standard PDF fonts", () => {
    expect(toWinAnsi("“Hi” – it’s 🎉 done…")).toBe('"Hi" – it\'s ?? done...');
  });
});
