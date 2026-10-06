import { afterEach, describe, expect, it, vi } from "vitest";
import { appSecret, resetEnvCache } from "@/lib/env";

/** A blank APP_SECRET must never take a page down in production. */
describe("appSecret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvCache();
  });

  it("uses APP_SECRET when it is long enough", () => {
    vi.stubEnv("APP_SECRET", "x".repeat(40));
    resetEnvCache();
    expect(appSecret()).toBe("x".repeat(40));
  });

  it("derives a stable secret from the service key when APP_SECRET is blank", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_SECRET", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key-abc");
    resetEnvCache();
    const a = appSecret();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("service-key-abc");
    resetEnvCache();
    expect(appSecret()).toBe(a);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "another-key");
    resetEnvCache();
    expect(appSecret()).not.toBe(a);
  });

  it("still refuses to run in production with neither", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_SECRET", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    resetEnvCache();
    expect(() => appSecret()).toThrow(/APP_SECRET/);
  });
});
