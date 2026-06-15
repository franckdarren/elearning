import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import postgres from "postgres";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function main() {
  const tables = await sql<{ tablename: string }[]>`
    select tablename from pg_tables
    where schemaname = 'public'
    order by tablename
  `;
  const types = await sql<{ typname: string }[]>`
    select typname from pg_type
    where typnamespace = 'public'::regnamespace and typtype = 'e'
    order by typname
  `;
  const functions = await sql<{ proname: string }[]>`
    select proname from pg_proc
    where pronamespace = 'public'::regnamespace
    order by proname
  `;
  const buckets = await sql<{ id: string; public: boolean }[]>`
    select id, public from storage.buckets order by id
  `;

  console.log(`Tables (public): ${tables.length}`);
  for (const t of tables) console.log(`  - ${t.tablename}`);
  console.log(`\nEnums (public): ${types.length}`);
  for (const t of types) console.log(`  - ${t.typname}`);
  console.log(`\nFunctions (public): ${functions.length}`);
  for (const f of functions) console.log(`  - ${f.proname}`);
  console.log(`\nStorage buckets: ${buckets.length}`);
  for (const b of buckets) console.log(`  - ${b.id} (public=${b.public})`);
}

main()
  .then(() => sql.end({ timeout: 5 }))
  .catch(async (e) => {
    console.error(e);
    await sql.end({ timeout: 5 });
    process.exit(1);
  });
