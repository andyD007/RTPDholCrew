import { describe, expect, it } from "vitest";
import { calculateQuote, suggestDeposit } from "@/lib/quotes/calculate";

describe("calculateQuote", () => {
  it("sums line items, fees, discount, tax, deposit and balance", () => {
    const t = calculateQuote({
      items: [
        { description: "Wedding Baraat", quantity: 1, unitPriceCents: 50_000 },
        { description: "Extra 30 minutes", quantity: 0.5, unitPriceCents: 20_000 },
      ],
      travelFeeCents: 4_500,
      additionalFeeCents: 2_500,
      discountCents: 5_000,
      taxRateBps: 725,
      depositRule: { type: "percent", percent: 30, minimumCents: 10_000 },
    });
    expect(t.baseFeeCents).toBe(60_000);
    expect(t.subtotalCents).toBe(62_000);
    expect(t.taxCents).toBe(4_495); // 62,000 × 7.25%
    expect(t.totalCents).toBe(66_495);
    expect(t.depositCents).toBe(19_900); // 30% rounded to whole dollars
    expect(t.balanceCents).toBe(t.totalCents - t.depositCents);
  });

  it("respects an explicit deposit and the minimum deposit", () => {
    expect(calculateQuote({ items: [{ description: "Solo", quantity: 1, unitPriceCents: 30_000 }], depositCents: 5_000 }).depositCents).toBe(5_000);
    expect(suggestDeposit(20_000, { type: "percent", percent: 30, minimumCents: 10_000 })).toBe(10_000);
    expect(suggestDeposit(5_000, { type: "percent", percent: 30, minimumCents: 10_000 })).toBe(5_000); // capped at total
    expect(suggestDeposit(0, { type: "fixed", amountCents: 10_000 })).toBe(0);
  });

  it("rejects invalid inputs", () => {
    expect(() => calculateQuote({ items: [{ description: "x", quantity: 1, unitPriceCents: 100 }], discountCents: 200 })).toThrow(/Discount/);
    expect(() => calculateQuote({ items: [{ description: "x", quantity: 0, unitPriceCents: 100 }] })).toThrow(/quantity/);
    expect(() => calculateQuote({ items: [{ description: "x", quantity: 1, unitPriceCents: -1 }] })).toThrow();
    expect(() => calculateQuote({ items: [{ description: "x", quantity: 1, unitPriceCents: 100 }], depositCents: 200 })).toThrow(/Deposit/);
    expect(() => calculateQuote({ items: [], taxRateBps: 6000 })).toThrow(/Tax/);
  });

  it("handles a zero-item quote", () => {
    const t = calculateQuote({ items: [], travelFeeCents: 0 });
    expect(t.totalCents).toBe(0);
    expect(t.depositCents).toBe(0);
    expect(t.balanceCents).toBe(0);
  });
});
