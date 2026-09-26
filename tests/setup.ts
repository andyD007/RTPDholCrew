import { vi } from "vitest";

// `server-only` throws when imported outside a React Server environment.
vi.mock("server-only", () => ({}));

/**
 * Integration tests run against a real Supabase-compatible API when these are
 * set (e.g. `supabase start` locally, or a disposable CI project):
 *   TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, TEST_SUPABASE_SERVICE_ROLE_KEY
 * Without them the integration suites are skipped and only unit tests run.
 */
if (process.env.TEST_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.TEST_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
} else {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}
// Never talk to real third parties from tests.
for (const k of ["RESEND_API_KEY", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "ANTHROPIC_API_KEY", "OPENAI_API_KEY", "ADMIN_NOTIFICATION_EMAIL"]) delete process.env[k];
process.env.AI_PROVIDER = "none";
process.env.STRIPE_SECRET_KEY = "sk_test_integration_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration_secret";
process.env.APP_SECRET = "test-secret-test-secret-test-secret-test-secret";
