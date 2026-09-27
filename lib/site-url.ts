const LOCAL = "http://localhost:3000";

/**
 * Normalise NEXT_PUBLIC_SITE_URL so a value typed as "rtpdholcrew.com",
 * "https://rtpdholcrew.com/" or with stray spaces still yields a valid origin.
 * When blank, uses Vercel's production domain (VERCEL_PROJECT_PRODUCTION_URL,
 * e.g. "rtpdholcrew.com"); falls back to localhost when neither is usable.
 */
export function normalizeSiteUrl(raw: string | undefined | null): string {
  let value = (raw ?? "").trim().replace(/^["']|["']$/g, "");
  // Blank → use the production domain Vercel provides at build/run time.
  if (!value) value = (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "").trim();
  if (!value) return LOCAL;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return LOCAL;
  }
}

export const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
