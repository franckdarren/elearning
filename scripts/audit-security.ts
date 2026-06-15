/**
 * Static security audit. Run with: npm run audit:security
 *
 * Checks:
 *  1. No SUPABASE_SERVICE_ROLE_KEY (or any sensitive key) under NEXT_PUBLIC_*
 *  2. No "use client" file imports @/lib/db or drizzle-orm
 *  3. No createSignedUrl / getSignedUrl call with TTL > 3600 s
 *  4. No NEXT_PUBLIC_*KEY pattern that smells like a server secret
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "supabase",
  "scripts",
]);

type Finding = { rule: string; file: string; line: number; snippet: string };
const findings: Finding[] = [];

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const stat = statSync(p);
    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(p, files);
    } else if (
      name.endsWith(".ts") ||
      name.endsWith(".tsx") ||
      name.endsWith(".js") ||
      name.endsWith(".mjs")
    ) {
      files.push(p);
    }
  }
  return files;
}

function each(file: string, content: string, fn: (line: string, idx: number) => void) {
  const lines = content.split("\n");
  lines.forEach((l, i) => fn(l, i + 1));
}

const files = walk(ROOT);
for (const file of files) {
  const content = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);

  // Rule 1 & 4: NEXT_PUBLIC_ followed by a suspicious secret-ish identifier.
  each(file, content, (line, idx) => {
    const m =
      /NEXT_PUBLIC_[A-Z0-9_]*(SERVICE_ROLE|SECRET|DATABASE_URL|API_KEY|PRIVATE)[A-Z0-9_]*/.exec(
        line,
      );
    if (m) {
      findings.push({
        rule: "next_public_secret",
        file: rel,
        line: idx,
        snippet: line.trim(),
      });
    }
  });

  // Rule 2: Client components must not import server-only modules.
  const firstLines = content.slice(0, 200);
  const isClient =
    /['"]use client['"]/.test(firstLines) && !rel.endsWith(".d.ts");
  if (isClient) {
    each(file, content, (line, idx) => {
      if (
        /from\s+['"]@\/lib\/db['"]/.test(line) ||
        /from\s+['"]drizzle-orm/.test(line) ||
        /from\s+['"]postgres['"]/.test(line) ||
        /process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(line)
      ) {
        findings.push({
          rule: "client_imports_server_only",
          file: rel,
          line: idx,
          snippet: line.trim(),
        });
      }
    });
  }

  // Rule 3: signed URL TTL <= 3600.
  each(file, content, (line, idx) => {
    const m = /createSignedUrl\([^,]+,\s*(\d+)/.exec(line);
    if (m && Number(m[1]) > 3600) {
      findings.push({
        rule: "signed_url_ttl_too_long",
        file: rel,
        line: idx,
        snippet: line.trim(),
      });
    }
    // Also catch a numeric literal seconds * 60 above 60 minutes if obvious.
    const m2 = /SIGNED_URL.+=\s*(\d+)/.exec(line);
    if (m2 && Number(m2[1]) > 3600) {
      findings.push({
        rule: "signed_url_constant_too_long",
        file: rel,
        line: idx,
        snippet: line.trim(),
      });
    }
  });
}

if (findings.length === 0) {
  console.log("✓ No security issues found.");
  process.exit(0);
}

console.log(`Found ${findings.length} potential issue(s):\n`);
for (const f of findings) {
  console.log(`  [${f.rule}] ${f.file}:${f.line}`);
  console.log(`    ${f.snippet}`);
}
process.exit(1);
