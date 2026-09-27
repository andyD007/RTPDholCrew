const LOCAL = "http://localhost:3000";

/**
 * Normalise NEXT_PUBLIC_SITE_URL so a value typed as "rtpdholcrew.com",
 * "https://rtpdholcrew.com/" or with stray spaces still yields a valid origin.
 * Falls back to localhost when missing or unparseable.
 */
export function normalizeSiteUrl(raw: string | undefined | null): string {
  let value = (raw ?? "").trim().replace(/^["']|["']$/g, "");
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
