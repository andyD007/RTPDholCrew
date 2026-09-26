import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env, integrations } from "@/lib/env";

export type TypedSupabaseClient = SupabaseClient<Database>;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.");
    this.name = "SupabaseNotConfiguredError";
  }
}

export function isSupabaseConfigured(): boolean {
  return integrations().supabase;
}

/**
 * Session-aware client for admin pages/actions. Queries run as the signed-in
 * user, so Row Level Security applies.
 */
export async function createSessionClient(): Promise<TypedSupabaseClient> {
  const e = env();
  if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new SupabaseNotConfiguredError();
  const cookieStore = await cookies();
  return createServerClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are refreshed by proxy.ts instead.
        }
      },
    },
  });
}

let serviceClient: TypedSupabaseClient | undefined;

/**
 * Service-role client. BYPASSES RLS — only use after the caller has been
 * authorised (admin role check, verified magic-link token, verified webhook)
 * and inputs have been validated.
 */
export function createServiceClient(): TypedSupabaseClient {
  if (serviceClient) return serviceClient;
  const e = env();
  if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY) throw new SupabaseNotConfiguredError();
  serviceClient = createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "rtp-dhol-crew-server" } },
  });
  return serviceClient;
}

let publicClient: TypedSupabaseClient | undefined;

/** Cookie-less anon client for cacheable public reads (RLS: published only). */
export function createPublicClient(): TypedSupabaseClient {
  if (publicClient) return publicClient;
  const e = env();
  if (!e.NEXT_PUBLIC_SUPABASE_URL || !e.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new SupabaseNotConfiguredError();
  publicClient = createClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return publicClient;
}

/** Throw a readable error for a failed Supabase query. */
export function unwrap<T>(result: { data: T | null; error: { message: string; code?: string } | null }, context: string): T {
  if (result.error) throw new Error(`${context}: ${result.error.message}${result.error.code ? ` (${result.error.code})` : ""}`);
  if (result.data === null) throw new Error(`${context}: no data`);
  return result.data;
}
