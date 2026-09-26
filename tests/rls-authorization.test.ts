import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "./helpers/pglite";

/**
 * Row Level Security, exercised as the real Postgres roles Supabase uses
 * (anon / authenticated with a JWT subject). Customers never hit tables
 * directly; these tests prove what the browser-reachable roles can and can't do.
 */
let db: PGlite;
const STAFF = "00000000-0000-4000-8000-000000000001";
const ADMIN = "00000000-0000-4000-8000-000000000002";
const OUTSIDER = "00000000-0000-4000-8000-000000000003";

async function as(role: "anon" | "authenticated", sub: string | null, fn: () => Promise<unknown>) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false); set role ${role};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
const count = async (sql: string) => Number((await db.query<{ c: number }>(sql)).rows[0].c);

beforeAll(async () => {
  db = await createTestDatabase({ seed: true });
  await db.exec(`
    insert into auth.users (id, email) values ('${STAFF}', 'staff@x.test'), ('${ADMIN}', 'admin@x.test'), ('${OUTSIDER}', 'someone@x.test');
    insert into public.users (id, email, role) values ('${STAFF}', 'staff@x.test', 'staff'), ('${ADMIN}', 'admin@x.test', 'admin');
    insert into public.audit_logs (action, entity_type) values ('test', 'test');
    insert into public.showcases (slug, title, is_published) values ('hidden-draft', 'Draft', false);
  `);
});
afterAll(async () => {
  await db.close();
});

describe("anonymous visitors", () => {
  it("can read published marketing content only", async () => {
    await as("anon", null, async () => {
      expect(await count("select count(*) as c from public.services")).toBeGreaterThan(5);
      expect(await count("select count(*) as c from public.showcases where slug = 'hidden-draft'")).toBe(0);
      expect(await count("select count(*) as c from public.showcases")).toBeGreaterThanOrEqual(8);
      expect(await count("select count(*) as c from public.settings where key = 'pricing.rules'")).toBe(0);
      expect(await count("select count(*) as c from public.settings where key = 'business.profile'")).toBe(1);
    });
  });

  it("cannot see or write CRM data", async () => {
    await as("anon", null, async () => {
      expect(await count("select count(*) as c from public.leads")).toBe(0);
      expect(await count("select count(*) as c from public.customers")).toBe(0);
      expect(await count("select count(*) as c from public.payments")).toBe(0);
      expect(await count("select count(*) as c from public.access_tokens")).toBe(0);
      await expect(db.query("insert into public.customers (first_name, last_name, email) values ('a','b','hacker@x.test')")).rejects.toThrow(/row-level security/);
      await expect(db.query("update public.services set name = 'pwned'")).resolves.toMatchObject({ affectedRows: 0 });
    });
  });

  it("cannot call server-only functions", async () => {
    await as("anon", null, async () => {
      await expect(db.query("select public.next_document_number('Q')")).rejects.toThrow(/permission denied/);
      await expect(db.query("select public.check_rate_limit('k', 1, 60)")).rejects.toThrow(/permission denied/);
    });
  });
});

describe("signed-in users who are not staff", () => {
  it("see nothing private", async () => {
    await as("authenticated", OUTSIDER, async () => {
      expect(await count("select count(*) as c from public.leads")).toBe(0);
      expect(await count("select count(*) as c from public.messages")).toBe(0);
      expect(await count("select count(*) as c from public.users")).toBe(0);
      await expect(db.query(`insert into public.users (id, email, role) values ('${OUTSIDER}', 'someone@x.test', 'owner')`)).rejects.toThrow(/row-level security/);
    });
  });
});

describe("staff", () => {
  it("can read and update CRM data", async () => {
    await as("authenticated", STAFF, async () => {
      expect(await count("select count(*) as c from public.leads")).toBeGreaterThanOrEqual(5);
      expect(await count("select count(*) as c from public.showcases where slug = 'hidden-draft'")).toBe(1);
      const res = await db.query("update public.leads set urgency = 'high' where reference = 'RTP-L-2026-0002'");
      expect(res.affectedRows).toBe(1);
      await db.query(`insert into public.admin_notes (lead_id, body, author_id) select id, 'hello', '${STAFF}' from public.leads limit 1`);
    });
  });

  it("cannot delete, change settings, read audit logs, tokens or write payments", async () => {
    await as("authenticated", STAFF, async () => {
      expect((await db.query("delete from public.admin_notes")).affectedRows).toBe(0);
      expect((await db.query("update public.settings set value = '{}'::jsonb")).affectedRows).toBe(0);
      expect(await count("select count(*) as c from public.audit_logs")).toBe(0);
      expect(await count("select count(*) as c from public.access_tokens")).toBe(0);
      expect(await count("select count(*) as c from public.payments")).toBeGreaterThan(0); // read-only
      expect((await db.query("update public.payments set amount_cents = 1")).affectedRows).toBe(0);
      expect((await db.query(`update public.users set role = 'owner' where id = '${STAFF}'`)).affectedRows).toBe(0);
    });
  });
});

describe("admins", () => {
  it("can manage settings, delete records and read the audit log", async () => {
    await as("authenticated", ADMIN, async () => {
      expect(await count("select count(*) as c from public.audit_logs")).toBeGreaterThan(0);
      expect((await db.query("update public.settings set is_public = is_public where key = 'pricing.rules'")).affectedRows).toBe(1);
      expect((await db.query("delete from public.admin_notes where body = 'hello'")).affectedRows).toBe(1);
      // Still no direct access to hashed customer tokens.
      expect(await count("select count(*) as c from public.access_tokens")).toBe(0);
    });
  });

  it("deactivated staff lose access immediately", async () => {
    await db.exec(`update public.users set is_active = false where id = '${STAFF}'`);
    await as("authenticated", STAFF, async () => {
      expect(await count("select count(*) as c from public.leads")).toBe(0);
    });
    await db.exec(`update public.users set is_active = true where id = '${STAFF}'`);
  });
});
