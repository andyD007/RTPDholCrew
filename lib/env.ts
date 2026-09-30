import "server-only";
import { z } from "zod";
import { normalizeSiteUrl } from "./site-url";
import { resolveSupabaseEnv } from "./supabase-env";

/**
 * Server-side environment. Every integration is optional so the app degrades
 * gracefully in development; `integrations` tells callers what is configured.
 * Never import this file from a client component (enforced by `server-only`).
 */
const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

/** Lower-case and trim a choice setting so "None " or "Anthropic" still match. */
const choice = <T extends [string, ...string[]]>(values: T, fallback: T[number]) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toLowerCase() : undefined),
    z.enum(values).default(fallback).catch(fallback),
  );

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .optional()
    .transform((v) => normalizeSiteUrl(v)),
  NEXT_PUBLIC_BUSINESS_TIMEZONE: optional.transform((v) => v ?? "America/New_York"),

  NEXT_PUBLIC_SUPABASE_URL: optional,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,
  // Blank values (a variable created but left empty) fall back to the defaults.
  SUPABASE_MEDIA_BUCKET: optional.transform((v) => v ?? "media"),
  SUPABASE_DOCUMENTS_BUCKET: optional.transform((v) => v ?? "documents"),

  APP_SECRET: optional,
  CRON_SECRET: optional,
  ADMIN_BOOTSTRAP_EMAILS: optional,
  CONTRACT_STORE_SIGNER_IP: z
    .string()
    .optional()
    .transform((v) => v !== "false"),

  STRIPE_SECRET_KEY: optional,
  STRIPE_WEBHOOK_SECRET: optional,
  STRIPE_STATEMENT_DESCRIPTOR_SUFFIX: optional,

  RESEND_API_KEY: optional,
  EMAIL_FROM: optional.transform((v) => v ?? "RTP Dhol Crew <bookings@rtpdholcrew.com>"),
  EMAIL_REPLY_TO: optional,
  ADMIN_NOTIFICATION_EMAIL: optional,

  TWILIO_ACCOUNT_SID: optional,
  TWILIO_AUTH_TOKEN: optional,
  TWILIO_FROM_NUMBER: optional,
  TWILIO_MESSAGING_SERVICE_SID: optional,

  AI_PROVIDER: choice(["anthropic", "openai", "none"], "anthropic"),
  ANTHROPIC_API_KEY: optional,
  ANTHROPIC_MODEL: optional.transform((v) => v ?? "claude-sonnet-5"),
  OPENAI_API_KEY: optional,
  OPENAI_MODEL: optional.transform((v) => v ?? "gpt-5-mini"),

  CALENDAR_PROVIDER: choice(["ics", "google"], "ics"),
  GOOGLE_CALENDAR_ID: optional,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: optional,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: optional,
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;
  const supabase = resolveSupabaseEnv();
  const parsed = schema.safeParse({
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: supabase.url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
  });
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${parsed.error.issues
        .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Reset the memoized env (tests only). */
export function resetEnvCache() {
  cached = undefined;
}

export function integrations() {
  const e = env();
  const aiKey = e.AI_PROVIDER === "anthropic" ? e.ANTHROPIC_API_KEY : e.AI_PROVIDER === "openai" ? e.OPENAI_API_KEY : undefined;
  return {
    supabase: Boolean(e.NEXT_PUBLIC_SUPABASE_URL && e.NEXT_PUBLIC_SUPABASE_ANON_KEY && e.SUPABASE_SERVICE_ROLE_KEY),
    stripe: Boolean(e.STRIPE_SECRET_KEY),
    stripeWebhook: Boolean(e.STRIPE_SECRET_KEY && e.STRIPE_WEBHOOK_SECRET),
    email: Boolean(e.RESEND_API_KEY),
    sms: Boolean(e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN && (e.TWILIO_FROM_NUMBER || e.TWILIO_MESSAGING_SERVICE_SID)),
    ai: Boolean(aiKey),
    googleCalendar: Boolean(
      e.CALENDAR_PROVIDER === "google" &&
        e.GOOGLE_CALENDAR_ID &&
        e.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        e.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    ),
  } as const;
}

/**
 * Secret used for HMAC operations. In production a missing APP_SECRET is a
 * hard error; in development a fixed dev secret keeps things working.
 */
export function appSecret(): string {
  const e = env();
  if (e.APP_SECRET && e.APP_SECRET.length >= 32) return e.APP_SECRET;
  if (e.NODE_ENV === "production") {
    throw new Error("APP_SECRET must be set (32+ chars) in production.");
  }
  return "development-only-secret-do-not-use-in-production-000";
}
