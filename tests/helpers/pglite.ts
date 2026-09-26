import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = path.resolve(__dirname, "../..");

/** Fresh in-process Postgres with all migrations (and optionally the seed) applied. */
export async function createTestDatabase({ seed = false } = {}) {
  const db = new PGlite({ extensions: { pgcrypto, citext, btree_gist } });
  await db.exec(readFileSync(path.join(root, "tests/sql/supabase-shim.sql"), "utf8"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).sort()) {
    await db.exec(readFileSync(path.join(root, "supabase/migrations", f), "utf8"));
  }
  if (seed) await db.exec(readFileSync(path.join(root, "supabase/seed.sql"), "utf8"));
  return db;
}
