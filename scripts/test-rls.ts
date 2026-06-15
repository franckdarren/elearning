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
  // Negative cases — these MUST fail or return 0 rows under RLS.
  // -----------------------------------------------------------------------

  // Student cannot read question_options (RLS strips the table entirely for them).
  const { data: optsAsStudent } = await student
    .from("question_options")
    .select("id, is_correct")
    .limit(1);
  checks.push({
    name: "student cannot read question_options (no is_correct leak)",
    pass: (optsAsStudent ?? []).length === 0,
    detail: fmt("rows", (optsAsStudent ?? []).length),
  });

  // Student cannot insert a profile (no insert policy).
  const { error: insertProfileErr } = await student
    .from("profiles")
    .insert({
      id: "00000000-0000-0000-0000-000000000000",
      role: "admin",
      first_name: "X",
      last_name: "Y",
      email: "x@y.z",
    });
  checks.push({
    name: "student cannot insert into profiles (privilege escalation blocked)",
    pass: !!insertProfileErr,
    detail: insertProfileErr ? insertProfileErr.code ?? "blocked" : "INSERT SUCCEEDED",
  });

  // Student cannot create a chapter (no write policy for students).
  const { data: anyClass } = await admin
    .from("classes")
    .select("id")
    .limit(1)
    .single();
  const { data: anySubject } = await admin
    .from("subjects")
    .select("id")
    .limit(1)
    .single();
  if (anyClass && anySubject) {
    const { error: chapErr } = await student.from("chapters").insert({
      class_id: anyClass.id,
      subject_id: anySubject.id,
      title: "Tentative",
    });
    checks.push({
      name: "student cannot create chapters",
      pass: !!chapErr,
      detail: chapErr ? chapErr.code ?? "blocked" : "INSERT SUCCEEDED",
    });
  }

  // Teacher cannot insert a chapter outside their assignment.
  const { data: otherClass } = await admin
    .from("classes")
    .select("id, name")
    .neq("name", "3ème A")
    .limit(1)
    .single();
  if (otherClass && anySubject) {
    const { error: outOfScopeErr } = await teacher.from("chapters").insert({
      class_id: otherClass.id,
      subject_id: anySubject.id,
      title: "Hors périmètre",
    });
    checks.push({
      name: "teacher cannot write chapters outside their (class, subject) scope",
      pass: !!outOfScopeErr,
      detail: outOfScopeErr ? outOfScopeErr.code ?? "blocked" : "INSERT SUCCEEDED",
    });
  }

  // Student cannot read another student's attempts.
  const { data: othersAttempts } = await student
    .from("quiz_attempts")
    .select("student_id")
    .neq("student_id", "00000000-0000-0000-0000-000000000000");
  const ownIds = new Set((othersAttempts ?? []).map((r: any) => r.student_id));
  checks.push({
    name: "student only sees their own quiz_attempts",
    pass: ownIds.size <= 1,
    detail: `distinct=${ownIds.size}`,
  });

  // Anon client cannot read videos bucket directly (private).
  const anon = createClient(URL, ANON);
  const { data: storageList, error: storageErr } = await anon.storage
    .from("videos")
    .list("");
  checks.push({
    name: "anon cannot list private 'videos' bucket",
    pass: !!storageErr || (storageList ?? []).length === 0,
    detail: storageErr ? storageErr.message : "empty list (OK)",
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
