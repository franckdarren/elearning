/**
 * Quick RLS smoke test.
 *
 * Signs in as student, teacher, admin and checks that:
 *   - Student sees ONLY their authorized subject (Maths), not Histoire.
 *   - Student cannot read another student's profile.
 *   - Teacher sees the class+subject they're assigned to.
 *   - Admin sees everything.
 *
 * Run with: npm run db:test-rls
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing");
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY missing");

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function signIn(email: string, password: string) {
  const client = createClient(URL, ANON);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Sign-in ${email}: ${error.message}`);
  return client;
}

function fmt(label: string, count: number) {
  return `${label}: ${count}`;
}

async function main() {
  const checks: Array<{ name: string; pass: boolean; detail: string }> = [];

  // -----------------------------------------------------------------------
  // Student
  // -----------------------------------------------------------------------
  const student = await signIn("student@passerelle.local", "Student123!");
  const { data: studentSubjects, error: e1 } = await student
    .from("class_subjects")
    .select("subject_id, subjects(name)");
  const subjectNames = (studentSubjects ?? []).map((r: any) => r.subjects?.name).filter(Boolean);
  checks.push({
    name: "student sees only Mathématiques via class_subjects",
    pass: !e1 && subjectNames.length === 1 && subjectNames[0] === "Mathématiques",
    detail: `[${subjectNames.join(", ")}]${e1 ? " err=" + e1.message : ""}`,
  });

  const { data: studentClasses } = await student.from("classes").select("name");
  const classNames = (studentClasses ?? []).map((c: any) => c.name);
  checks.push({
    name: "student sees only their enrolled class (3ème A)",
    pass: classNames.length === 1 && classNames[0] === "3ème A",
    detail: `[${classNames.join(", ")}]`,
  });

  const { data: studentProfiles } = await student.from("profiles").select("email");
  const profileEmails = (studentProfiles ?? []).map((p: any) => p.email);
  checks.push({
    name: "student sees only their own profile",
    pass: profileEmails.length === 1 && profileEmails[0] === "student@passerelle.local",
    detail: `[${profileEmails.join(", ")}]`,
  });

  // -----------------------------------------------------------------------
  // Teacher
  // -----------------------------------------------------------------------
  const teacher = await signIn("teacher@passerelle.local", "Teacher123!");
  const { data: teacherAssignments } = await teacher
    .from("teacher_assignments")
    .select("class_id, subject_id");
  checks.push({
    name: "teacher sees their own assignment",
    pass: (teacherAssignments ?? []).length === 1,
    detail: fmt("count", (teacherAssignments ?? []).length),
  });

  const { data: teacherClasses } = await teacher.from("classes").select("name");
  const tClassNames = (teacherClasses ?? []).map((c: any) => c.name);
  checks.push({
    name: "teacher sees their assigned class only (3ème A)",
    pass: tClassNames.length === 1 && tClassNames[0] === "3ème A",
    detail: `[${tClassNames.join(", ")}]`,
  });

  // -----------------------------------------------------------------------
  // Admin
  // -----------------------------------------------------------------------
  const admin = await signIn("admin@passerelle.local", "Admin123!");
  const { data: adminClasses } = await admin.from("classes").select("name");
  checks.push({
    name: "admin sees every class",
    pass: (adminClasses ?? []).length >= 2,
    detail: fmt("classes", (adminClasses ?? []).length),
  });

  const { data: adminProfiles } = await admin.from("profiles").select("email");
  checks.push({
    name: "admin sees every profile",
    pass: (adminProfiles ?? []).length >= 3,
    detail: fmt("profiles", (adminProfiles ?? []).length),
  });

  // -----------------------------------------------------------------------
  // Report
  // -----------------------------------------------------------------------
  let failed = 0;
  for (const c of checks) {
    const tag = c.pass ? "PASS" : "FAIL";
    if (!c.pass) failed++;
    console.log(`  [${tag}] ${c.name} — ${c.detail}`);
  }
  console.log(`\n${checks.length - failed}/${checks.length} checks passed.`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
