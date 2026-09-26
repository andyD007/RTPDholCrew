/**
 * Pure quote arithmetic. Shared by the admin quote builder (live preview),
 * the server action that persists quotes, the seed generator and tests, so
 * the numbers can never drift between UI and database.
 *
 * Order of operations:
 *   base fee   = Σ line items (quantity × unit price)
 *   subtotal   = base + travel + additional − discount   (never below 0)
 *   tax        = round(subtotal × taxRateBps / 10 000)
 *   total      = subtotal + tax
 *   deposit    = explicit amount, or max(minimum, total × percent), rounded to
 *                whole dollars and capped at total
 *   balance    = total − deposit
 */
export type QuoteLineInput = { description: string; quantity: number; unitPriceCents: number; serviceId?: string | null };

export type DepositRule =
  | { type: "percent"; percent: number; minimumCents?: number }
  | { type: "fixed"; amountCents: number };

export type QuoteCalculationInput = {
  items: QuoteLineInput[];
  travelFeeCents?: number;
  additionalFeeCents?: number;
  discountCents?: number;
  taxRateBps?: number;
  depositCents?: number | null;
  depositRule?: DepositRule;
};

export type QuoteTotals = {
  lines: (QuoteLineInput & { totalCents: number })[];
  baseFeeCents: number;
  travelFeeCents: number;
  additionalFeeCents: number;
  discountCents: number;
  subtotalCents: number;
  taxRateBps: number;
  taxCents: number;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
};

export const DEFAULT_DEPOSIT_RULE: DepositRule = { type: "percent", percent: 30, minimumCents: 10000 };

function nonNegInt(n: number | undefined | null, label: string): number {
  const v = Math.round(n ?? 0);
  if (!Number.isFinite(v) || v < 0) throw new Error(`${label} must be a non-negative amount`);
  return v;
}

export function calculateQuote(input: QuoteCalculationInput): QuoteTotals {
  const lines = input.items.map((item) => {
    if (!(item.quantity > 0)) throw new Error("Line item quantity must be positive");
    const unit = nonNegInt(item.unitPriceCents, "Unit price");
    return { ...item, unitPriceCents: unit, totalCents: Math.round(item.quantity * unit) };
  });
  const baseFeeCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const travelFeeCents = nonNegInt(input.travelFeeCents, "Travel fee");
  const additionalFeeCents = nonNegInt(input.additionalFeeCents, "Additional fee");
  const discountCents = nonNegInt(input.discountCents, "Discount");
  const taxRateBps = nonNegInt(input.taxRateBps, "Tax rate");
  if (taxRateBps > 5000) throw new Error("Tax rate cannot exceed 50%");

  const gross = baseFeeCents + travelFeeCents + additionalFeeCents;
  if (discountCents > gross) throw new Error("Discount cannot exceed the quote amount");
  const subtotalCents = gross - discountCents;
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10_000);
  const totalCents = subtotalCents + taxCents;

  let depositCents: number;
  if (input.depositCents !== undefined && input.depositCents !== null) {
    depositCents = nonNegInt(input.depositCents, "Deposit");
    if (depositCents > totalCents) throw new Error("Deposit cannot exceed the total");
  } else {
    depositCents = suggestDeposit(totalCents, input.depositRule ?? DEFAULT_DEPOSIT_RULE);
  }

  return {
    lines,
    baseFeeCents,
    travelFeeCents,
    additionalFeeCents,
    discountCents,
    subtotalCents,
    taxRateBps,
    taxCents,
    totalCents,
    depositCents,
    balanceCents: totalCents - depositCents,
  };
}

export function suggestDeposit(totalCents: number, rule: DepositRule): number {
  if (totalCents <= 0) return 0;
  let deposit =
    rule.type === "fixed"
      ? rule.amountCents
      : Math.max(rule.minimumCents ?? 0, Math.round((totalCents * rule.percent) / 100 / 100) * 100);
  deposit = Math.min(deposit, totalCents);
  return Math.max(0, deposit);
}
