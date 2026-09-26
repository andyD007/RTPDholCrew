import "server-only";
import { createServiceClient, isSupabaseConfigured } from "@/lib/database/server";

/**
 * Fixed-window rate limiting for public endpoints. Uses the Postgres
 * `check_rate_limit` function (shared across serverless instances); falls back
 * to an in-memory window when the database isn't configured (development).
 */
const memory = new Map<string, { count: number; start: number }>();

export type RateLimitResult = { ok: boolean };

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  if (isSupabaseConfigured()) {
    const { data, error } = await createServiceClient().rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (!error) return { ok: Boolean(data) };
    console.error("[rate-limit] falling back to memory:", error.message);
  }
  return memoryLimit(key, limit, windowSeconds);
}

export function memoryLimit(key: string, limit: number, windowSeconds: number, now = Date.now()): RateLimitResult {
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSeconds * 1000) {
    memory.set(key, { count: 1, start: now });
    return { ok: true };
  }
  entry.count += 1;
  return { ok: entry.count <= limit };
}
