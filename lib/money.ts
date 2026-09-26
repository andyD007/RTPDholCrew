/** All money is handled as integer cents. */
export function formatMoney(cents: number | null | undefined, opts: { showCents?: boolean } = {}): string {
  const value = (cents ?? 0) / 100;
  const showCents = opts.showCents ?? (cents ?? 0) % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(value);
}

/** Parse a user-entered dollar amount ("1,250.50", "$300") to cents. */
export function dollarsToCents(input: string | number): number {
  if (typeof input === "number") return Math.round(input * 100);
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error(`Invalid amount: ${input}`);
  return Math.round(n * 100);
}

export function centsToDollarsString(cents: number): string {
  return (cents / 100).toFixed(2);
}
