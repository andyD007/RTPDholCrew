import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl, resolveSupabaseEnv } from "@/lib/supabase-env";

describe("normalizeSupabaseUrl", () => {
  it.each([
    ["https://abcdefghij.supabase.co", "https://abcdefghij.supabase.co"],
    ["https://abcdefghij.supabase.co/", "https://abcdefghij.supabase.co"],
    ["https://abcdefghij.supabase.co/rest/v1", "https://abcdefghij.supabase.co"],
    ["abcdefghij.supabase.co", "https://abcdefghij.supabase.co"],
    [" https://ABCDEFGHIJ.supabase.co ", "https://abcdefghij.supabase.co"],
    ["db.abcdefghij.supabase.co", "https://abcdefghij.supabase.co"],
    ["https://supabase.com/dashboard/project/abcdefghij", "https://abcdefghij.supabase.co"],
    ["https://supabase.com/dashboard/project/abcdefghij/settings/api", "https://abcdefghij.supabase.co"],
    ["http://localhost:54321", "http://localhost:54321"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeSupabaseUrl(input)).toBe(expected);
  });

  it("returns undefined for blanks", () => {
    expect(normalizeSupabaseUrl("")).toBeUndefined();
    expect(normalizeSupabaseUrl(undefined)).toBeUndefined();
  });

  it("resolves alternative variable names", () => {
    const r = resolveSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "", SUPABASE_URL: "abcdefghij.supabase.co", SUPABASE_ANON_KEY: "a", SUPABASE_SECRET_KEY: "s" });
    expect(r).toEqual({ url: "https://abcdefghij.supabase.co", anonKey: "a", serviceRoleKey: "s" });
  });
});
