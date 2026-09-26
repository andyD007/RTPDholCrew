import "server-only";
import { z } from "zod";
import { defaultSettings } from "@/lib/content/catalog";
import type { Json } from "@/types/database";
import type { TypedSupabaseClient } from "./server";
import { createServiceClient, isSupabaseConfigured } from "./server";

/**
 * Typed business settings. Each key has a Zod schema; stored values are merged
 * over the catalog defaults so a partially-filled row never breaks the app.
 */
export const settingSchemas = {
  "business.profile": z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().min(7).max(40),
    address: z.string().max(200),
    serviceArea: z.string().max(200),
  }),
  "business.social": z.object({
    instagram: z.string().url().or(z.literal("")),
    facebook: z.string().url().or(z.literal("")),
    googleReview: z.string().url().or(z.literal("")),
    facebookReview: z.string().url().or(z.literal("")),
  }),
  "pricing.rules": z.object({
    travelFreeRadiusMiles: z.number().min(0).max(500),
    travelPerMileCents: z.number().int().min(0).max(10_000),
    weekendPremiumPercent: z.number().min(0).max(100),
    peakSeasonMonths: z.array(z.number().int().min(1).max(12)),
    peakSeasonPremiumPercent: z.number().min(0).max(100),
    lastMinuteDays: z.number().int().min(0).max(365),
    lastMinutePremiumPercent: z.number().min(0).max(100),
    additionalPerformerPercent: z.number().min(0).max(200),
    defaultTaxRateBps: z.number().int().min(0).max(5000),
  }),
  "deposit.rules": z.object({
    type: z.enum(["percent", "fixed"]),
    percent: z.number().min(0).max(100),
    minimumCents: z.number().int().min(0),
    quoteExpiryDays: z.number().int().min(1).max(90),
  }),
  "contract.policies": z.object({
    cancellationPolicy: z.string().min(10).max(5000),
    overtimePolicy: z.string().min(10).max(5000),
    travelTerms: z.string().min(10).max(5000),
  }),
  "availability.rules": z.object({
    defaultTravelBufferMinutes: z.number().int().min(0).max(600),
    maxEventsPerDay: z.number().int().min(1).max(20),
    manualReviewGapMinutes: z.number().int().min(0).max(600),
  }),
  "automation.limits": z.object({
    maxMessagesPerLeadPerDay: z.number().int().min(1).max(20),
    quietHoursStart: z.number().int().min(0).max(23),
    quietHoursEnd: z.number().int().min(0).max(23),
    maxFollowUpsPerStage: z.number().int().min(0).max(10),
  }),
  "ai.settings": z.object({
    autoAnalyzeLeads: z.boolean(),
    contentAutoPublish: z.boolean(),
  }),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export type SettingValue<K extends SettingKey> = z.infer<(typeof settingSchemas)[K]>;

export function defaultSettingValue<K extends SettingKey>(key: K): SettingValue<K> {
  const row = defaultSettings.find((s) => s.key === key);
  if (!row) throw new Error(`No default for setting ${key}`);
  return settingSchemas[key].parse(row.value) as SettingValue<K>;
}

export async function getSetting<K extends SettingKey>(key: K, db?: TypedSupabaseClient): Promise<SettingValue<K>> {
  const fallback = defaultSettingValue(key);
  if (!db && !isSupabaseConfigured()) return fallback;
  const client = db ?? createServiceClient();
  const { data, error } = await client.from("settings").select("value").eq("key", key).maybeSingle();
  if (error || !data) return fallback;
  const merged = { ...(fallback as object), ...((data.value as object) ?? {}) };
  const parsed = settingSchemas[key].safeParse(merged);
  return parsed.success ? (parsed.data as SettingValue<K>) : fallback;
}

export async function getAllSettings(db?: TypedSupabaseClient) {
  const keys = Object.keys(settingSchemas) as SettingKey[];
  const entries = await Promise.all(keys.map(async (k) => [k, await getSetting(k, db)] as const));
  return Object.fromEntries(entries) as { [K in SettingKey]: SettingValue<K> };
}

export async function saveSetting<K extends SettingKey>(
  key: K,
  value: SettingValue<K>,
  db: TypedSupabaseClient,
  userId: string | null,
): Promise<void> {
  const parsed = settingSchemas[key].parse(value);
  const isPublic = defaultSettings.find((s) => s.key === key)?.isPublic ?? false;
  const { error } = await db
    .from("settings")
    .upsert({ key, value: parsed as Json, is_public: isPublic, updated_by: userId, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to save setting ${key}: ${error.message}`);
}
