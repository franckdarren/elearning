/**
 * Migration runner.
 *
 * Executes every *.sql file in supabase/migrations/ in lexical order against
 * the DATABASE_URL. Each file runs in its own transaction; if a statement
 * fails the file is rolled back.
 *
 * We don't use drizzle-kit's `migrate` here because we mix drizzle-generated
 * SQL (0000_init.sql) with hand-written SQL (0001_rls.sql, 0002_storage.sql).
 *
 * Run with: npm run db:apply
 *
 * Safe to re-run: a `schema_migrations` tracking table records what's
 * already been applied (by filename).
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
});

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

async function main() {
  await sql`
    create table if not exists public._migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const already = await sql`
      select 1 from public._migrations where filename = ${file}
    `;
    if (already.length > 0) {
      console.log(`  · ${file} — already applied`);
      continue;
    }

    const content = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    process.stdout.write(`  → ${file} ... `);

    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`insert into public._migrations (filename) values (${file})`;
      });
      console.log("ok");
    } catch (err) {
      console.log("FAILED");
      throw err;
    }
  }

  console.log("\nAll migrations applied.");
}

main()
  .then(() => sql.end({ timeout: 5 }))
  .catch(async (err) => {
    console.error(err);
    await sql.end({ timeout: 5 });
    process.exit(1);
  });
