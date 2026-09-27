/**
 * Supabase settings under every name the Supabase ↔ Vercel integration (old
 * and new) or a manual setup might use. Server code reads these at runtime;
 * next.config.ts inlines the public ones for the browser and proxy.
 */
type Env = Record<string, string | undefined>;

const first = (...values: (string | undefined)[]) => values.map((v) => v?.trim()).find((v) => v) || undefined;

export function resolveSupabaseEnv(e: Env = process.env) {
  return {
    url: first(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_URL),
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
