import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDatabase } from "./helpers/pglite";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase({ seed: true });
});
afterAll(async () => {
  await db.close();
});

describe("database migrations + seed", () => {
  it("seeds the minimum sample data", async () => {
    const count = async (sql: string) => Number((await db.query<{ c: number }>(sql)).rows[0].c);
    expect(await count("select count(*) as c from public.showcases where is_published")).toBeGreaterThanOrEqual(8);
    expect(await count("select count(*) as c from public.media where is_published")).toBeGreaterThanOrEqual(10);
    expect(await count("select count(*) as c from public.services where is_active")).toBeGreaterThanOrEqual(6);
    expect(await count("select count(*) as c from public.testimonials where is_published")).toBeGreaterThanOrEqual(5);
    expect(await count("select count(distinct status) as c from public.leads")).toBeGreaterThanOrEqual(5);
  });

  it("generates sequential, year-scoped document numbers after the seed", async () => {
    const r = await db.query<{ n: string }>("select public.next_document_number('Q', '2026-10-01T12:00:00Z') as n");
    expect(r.rows[0].n).toMatch(/^RTP-Q-2026-\d{4}$/);
    const r2 = await db.query<{ n: string }>("select public.next_document_number('Q', '2027-01-15T12:00:00Z') as n");
    expect(r2.rows[0].n).toBe("RTP-Q-2027-0001");
    await expect(db.query("select public.next_document_number('bad scope')")).rejects.toThrow();
  });

  it("enforces quote money invariants", async () => {
    const lead = (await db.query<{ id: string }>("select id from public.leads limit 1")).rows[0];
    await expect(
      db.query(
        `insert into public.quotes (number, lead_id, performance_minutes, total_cents, deposit_cents, balance_cents)
         values ('RTP-Q-TEST-1', $1, 60, 1000, 400, 500)`,
        [lead.id],
      ),
    ).rejects.toThrow(/check/);
    await expect(
      db.query(
        `insert into public.quotes (number, lead_id, performance_minutes, total_cents, deposit_cents, balance_cents)
         values ('RTP-Q-TEST-2', $1, 60, 1000, 2000, -1000)`,
        [lead.id],
      ),
    ).rejects.toThrow();
  });

  it("allows only one live contract per quote", async () => {
    const c = (await db.query<{ quote_id: string; lead_id: string }>("select quote_id, lead_id from public.contracts limit 1")).rows[0];
    await expect(
      db.query(
        `insert into public.contracts (number, lead_id, quote_id, template_version, body, content_hash)
         values ('RTP-C-TEST', $1, $2, 1, 'x', 'y')`,
        [c.lead_id, c.quote_id],
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it("rate limiter allows N requests per window", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      results.push((await db.query<{ ok: boolean }>("select public.check_rate_limit('test:ip', 3, 60) as ok")).rows[0].ok);
    }
    expect(results).toEqual([true, true, true, false]);
  });

  it("keeps updated_at and status_changed_at current", async () => {
    const before = (await db.query<{ id: string; updated_at: string; status_changed_at: string }>(
      "select id, updated_at, status_changed_at from public.leads where status = 'new' limit 1",
    )).rows[0];
    await new Promise((r) => setTimeout(r, 10));
    await db.query("update public.leads set status = 'contacted' where id = $1", [before.id]);
    const after = (await db.query<{ updated_at: string; status_changed_at: string }>(
      "select updated_at, status_changed_at from public.leads where id = $1",
      [before.id],
    )).rows[0];
    expect(new Date(after.updated_at).getTime()).toBeGreaterThan(new Date(before.updated_at).getTime());
    expect(new Date(after.status_changed_at).getTime()).toBeGreaterThan(new Date(before.status_changed_at).getTime());
  });

  it("enables row level security on every public table", async () => {
    const r = await db.query<{ relname: string }>(
      "select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity",
    );
    expect(r.rows.map((x) => x.relname)).toEqual([]);
  });
});
