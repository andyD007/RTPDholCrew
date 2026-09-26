/**
 * Generates `types/database.ts` in the same shape as `supabase gen types
 * typescript`, by applying the migrations to an in-process Postgres (PGlite)
 * and introspecting the catalog. No Docker or running database required.
 *
 *   npm run db:types
 *
 * (With the Supabase CLI you can instead run:
 *   supabase gen types typescript --local > types/database.ts)
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const root = process.cwd();

async function main() {
  const db = new PGlite({ extensions: { pgcrypto, citext, btree_gist } });
  await db.exec(readFileSync(path.join(root, "tests/sql/supabase-shim.sql"), "utf8"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).sort()) {
    await db.exec(readFileSync(path.join(root, "supabase/migrations", f), "utf8"));
  }

  const enums = (
    await db.query<{ name: string; values: string[] }>(`
      select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as values
      from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' group by t.typname order by t.typname`)
  ).rows;
  const enumNames = new Set(enums.map((e) => e.name));

  const columns = (
    await db.query<{
      table_name: string;
      column_name: string;
      udt_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
      is_generated: string;
    }>(`
      select c.table_name, c.column_name, c.udt_name, c.data_type, c.is_nullable, c.column_default, c.is_generated
      from information_schema.columns c
      join information_schema.tables t on t.table_name = c.table_name and t.table_schema = c.table_schema
      where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      order by c.table_name, c.ordinal_position`)
  ).rows;

  const fks = (
    await db.query<{ conname: string; table_name: string; columns: string[]; ref_table: string; ref_columns: string[]; one_to_one: boolean }>(`
      select con.conname, rel.relname as table_name,
        array(select att.attname from unnest(con.conkey) with ordinality k(n, i) join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.n order by k.i) as columns,
        frel.relname as ref_table,
        array(select att.attname from unnest(con.confkey) with ordinality k(n, i) join pg_attribute att on att.attrelid = con.confrelid and att.attnum = k.n order by k.i) as ref_columns,
        exists (
          select 1 from pg_index ix
          where ix.indrelid = con.conrelid and ix.indisunique and ix.indpred is null
            and (select array_agg(x order by x) from unnest(ix.indkey::int2[]) x) = (select array_agg(x order by x) from unnest(con.conkey) x)
        ) as one_to_one
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_class frel on frel.oid = con.confrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where con.contype = 'f' and n.nspname = 'public'
      order by rel.relname, con.conname`)
  ).rows;

  const functions = (
    await db.query<{ name: string; arg_names: string[] | null; arg_types: string[]; n_defaults: number; ret: string }>(`
      select p.proname as name, p.proargnames as arg_names,
        array(select format_type(t, null) from unnest(p.proargtypes) t) as arg_types,
        p.pronargdefaults as n_defaults, format_type(p.prorettype, null) as ret
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and format_type(p.prorettype, null) <> 'trigger'
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      order by p.proname`)
  ).rows;

  const tsType = (udt: string, dataType: string): string => {
    if (dataType === "ARRAY") return `${tsType(udt.replace(/^_/, ""), "")}[]`;
    if (enumNames.has(udt)) return `Database["public"]["Enums"]["${udt}"]`;
    switch (udt) {
      case "int2": case "int4": case "int8": case "numeric": case "float4": case "float8":
      case "smallint": case "integer": case "bigint":
        return "number";
      case "bool": case "boolean":
        return "boolean";
      case "json": case "jsonb":
        return "Json";
      default:
        return "string";
    }
  };
  const fnType = (t: string): string => {
    const clean = t.replace(/^public\./, "");
    if (enumNames.has(clean)) return `Database["public"]["Enums"]["${clean}"]`;
    if (/^(integer|smallint|bigint|numeric|real|double precision)$/.test(clean)) return "number";
    if (clean === "boolean") return "boolean";
    if (clean === "jsonb" || clean === "json") return "Json";
    if (clean === "void") return "undefined";
    return "string";
  };

  const tables = [...new Set(columns.map((c) => c.table_name))].sort();
  const lines: string[] = [
    "// GENERATED by scripts/gen-db-types.ts — do not edit by hand. Run `npm run db:types`.",
    "export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];",
    "",
    "export type Database = {",
    "  public: {",
    "    Tables: {",
  ];
  for (const t of tables) {
    const cols = columns.filter((c) => c.table_name === t);
    const row = cols.map((c) => `          ${c.column_name}: ${tsType(c.udt_name, c.data_type)}${c.is_nullable === "YES" ? " | null" : ""};`);
    const ins = cols
      .filter((c) => c.is_generated !== "ALWAYS")
      .map((c) => {
        const optional = c.is_nullable === "YES" || c.column_default !== null;
        return `          ${c.column_name}${optional ? "?" : ""}: ${tsType(c.udt_name, c.data_type)}${c.is_nullable === "YES" ? " | null" : ""};`;
      });
    const upd = cols
      .filter((c) => c.is_generated !== "ALWAYS")
      .map((c) => `          ${c.column_name}?: ${tsType(c.udt_name, c.data_type)}${c.is_nullable === "YES" ? " | null" : ""};`);
    const rels = fks
      .filter((f) => f.table_name === t)
      .map(
        (f) =>
          `          {\n            foreignKeyName: "${f.conname}";\n            columns: [${f.columns.map((c) => `"${c}"`).join(", ")}];\n            isOneToOne: ${f.one_to_one};\n            referencedRelation: "${f.ref_table}";\n            referencedColumns: [${f.ref_columns.map((c) => `"${c}"`).join(", ")}];\n          },`,
      );
    lines.push(
      `      ${t}: {`,
      "        Row: {",
      ...row,
      "        };",
      "        Insert: {",
      ...ins,
      "        };",
      "        Update: {",
      ...upd,
      "        };",
      `        Relationships: [${rels.length ? "\n" + rels.join("\n") + "\n        " : ""}];`,
      "      };",
    );
  }
  lines.push("    };", "    Views: { [_ in never]: never };", "    Functions: {");
  for (const f of functions) {
    const names = f.arg_names ?? [];
    const firstDefault = f.arg_types.length - f.n_defaults;
    const args = f.arg_types.map((t, i) => `${names[i] ?? `arg${i}`}${i >= firstDefault ? "?" : ""}: ${fnType(t)}`);
    lines.push(`      ${f.name}: { Args: ${args.length ? `{ ${args.join("; ")} }` : "Record<PropertyKey, never>"}; Returns: ${fnType(f.ret)} };`);
  }
  lines.push("    };", "    Enums: {");
  for (const e of enums) lines.push(`      ${e.name}: ${e.values.map((v) => `"${v}"`).join(" | ")};`);
  lines.push("    };", "    CompositeTypes: { [_ in never]: never };", "  };", "};", "");
  lines.push(
    'type PublicSchema = Database["public"];',
    'export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];',
    'export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];',
    'export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];',
    'export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];',
    "",
    "export const Constants = {",
    "  public: {",
    "    Enums: {",
    ...enums.map((e) => `      ${e.name}: [${e.values.map((v) => `"${v}"`).join(", ")}],`),
    "    },",
    "  },",
    "} as const;",
    "",
  );
  writeFileSync(path.join(root, "types/database.ts"), lines.join("\n"));
  console.log(`✓ types/database.ts (${tables.length} tables, ${enums.length} enums, ${functions.length} functions)`);
  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
