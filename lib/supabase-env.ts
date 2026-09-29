/**
 * Supabase settings under every name the Supabase ↔ Vercel integration (old
 * and new) or a manual setup might use. Server code reads these at runtime;
 * next.config.ts inlines the public ones for the browser and proxy.
 */
type Env = Record<string, string | undefined>;

const first = (...values: (string | undefined)[]) => values.map((v) => v?.trim()).find((v) => v) || undefined;

/**
 * Turn whatever was pasted into the project API origin, e.g.
 *   https://supabase.com/dashboard/project/<ref>/settings/api → https://<ref>.supabase.co
 *   db.<ref>.supabase.co / <ref>.supabase.co/rest/v1          → https://<ref>.supabase.co
 * Anything else that parses as a URL is reduced to its origin (self-hosted,
 * local development).
 */
export function normalizeSupabaseUrl(raw: string | undefined): string | undefined {
  let value = raw?.trim().replace(/^["']|["']$/g, "");
  if (!value) return undefined;
  const dashboard = value.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dashboard) return `https://${dashboard[1].toLowerCase()}.supabase.co`;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    const hosted = url.hostname.match(/^(?:db\.)?([a-z0-9]+)\.supabase\.co$/i);
    if (hosted) return `https://${hosted[1].toLowerCase()}.supabase.co`;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function resolveSupabaseEnv(e: Env = process.env) {
  return {
    url: normalizeSupabaseUrl(first(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_URL)),
    anonKey: first(
      e.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      e.SUPABASE_ANON_KEY,
      e.SUPABASE_PUBLISHABLE_KEY,
    ),
    serviceRoleKey: first(e.SUPABASE_SERVICE_ROLE_KEY, e.SUPABASE_SECRET_KEY),
  };
}
