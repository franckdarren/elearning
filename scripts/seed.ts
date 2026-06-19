/**
 * Seed script — La-Passerelle Du Savoir
 *
 * Creates a minimal dataset:
 *   - 1 admin, 1 teacher, 1 student (via Supabase Auth admin API)
 *   - Profiles are inserted by the on_auth_user_created trigger (0001_rls.sql)
 *   - 1 current academic_year, 2 classes, 3 subjects, class_subjects
 *   - 1 teacher_assignment, 1 student_enrollment, student_subject_access for Maths
 *
 * Run with:  npm run db:seed
 *
 * Safe to re-run: every step is idempotent.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";

import * as schema from "../lib/db/schema";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client, { schema });

type Role = "admin" | "manager" | "teacher" | "student";

async function ensureUser(opts: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  establishmentId?: string | null;
}): Promise<string> {
  const establishmentId = opts.establishmentId ?? null;
  const existing = await db
    .select({ id: schema.profiles.id })
    .from(schema.profiles)
    .where(eq(schema.profiles.email, opts.email))
    .limit(1);
  if (existing[0]) {
    console.log(`  · ${opts.email} (${opts.role}) — already exists`);
    if (establishmentId) {
      await db
        .update(schema.profiles)
        .set({ establishmentId })
        .where(eq(schema.profiles.id, existing[0].id));
    }
    return existing[0].id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: opts.email,
    password: opts.password,
    email_confirm: true,
    user_metadata: {
      first_name: opts.firstName,
      last_name: opts.lastName,
      role: opts.role,
      establishment_id: establishmentId ?? "",
    },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");

  // Trigger inserts the profile asynchronously — wait one beat.
  await new Promise((r) => setTimeout(r, 300));
  await db
    .update(schema.profiles)
    .set({
      role: opts.role,
      firstName: opts.firstName,
      lastName: opts.lastName,
      establishmentId,
    })
    .where(eq(schema.profiles.id, data.user.id));

  console.log(`  ✓ ${opts.email} (${opts.role}) created`);
  return data.user.id;
}

async function ensureEstablishment(name: string) {
  const found = await db
    .select()
    .from(schema.establishments)
    .where(eq(schema.establishments.name, name))
    .limit(1);
  if (found[0]) return found[0];
  const [row] = await db
    .insert(schema.establishments)
    .values({ name })
    .returning();
  return row;
}

async function ensureAcademicYear(label: string) {
  const found = await db
    .select()
    .from(schema.academicYears)
    .where(eq(schema.academicYears.label, label))
    .limit(1);
  if (found[0]) return found[0];
  const [row] = await db
    .insert(schema.academicYears)
    .values({
      label,
      startDate: "2025-09-01",
      endDate: "2026-07-15",
      isCurrent: true,
    })
    .returning();
  return row;
}

async function ensureSubject(name: string, establishmentId: string) {
  const found = await db
    .select()
    .from(schema.subjects)
    .where(eq(schema.subjects.name, name))
    .limit(1);
  if (found[0]) return found[0];
  const [row] = await db
    .insert(schema.subjects)
    .values({ name, establishmentId })
    .returning();
  return row;
}

async function ensureClass(opts: {
  name: string;
  level: string;
  yearId: string;
  establishmentId: string;
}) {
  const found = await db
    .select()
    .from(schema.classes)
    .where(eq(schema.classes.name, opts.name))
    .limit(1);
  if (found[0]) return found[0];
  const [row] = await db
    .insert(schema.classes)
    .values({
      name: opts.name,
      level: opts.level,
      academicYearId: opts.yearId,
      establishmentId: opts.establishmentId,
    })
    .returning();
  return row;
}

async function ensureClassSubject(classId: string, subjectId: string) {
  await db
    .insert(schema.classSubjects)
    .values({ classId, subjectId })
    .onConflictDoNothing();
}

async function ensureTeacherAssignment(
  teacherId: string,
  classId: string,
  subjectId: string,
) {
  await db
    .insert(schema.teacherAssignments)
    .values({ teacherId, classId, subjectId })
    .onConflictDoNothing();
}

async function ensureStudentEnrollment(studentId: string, classId: string) {
  await db
    .insert(schema.studentEnrollments)
    .values({ studentId, classId })
    .onConflictDoNothing();
}

async function ensureStudentSubjectAccess(
  studentId: string,
  classId: string,
  subjectId: string,
) {
  await db
    .insert(schema.studentSubjectAccess)
    .values({ studentId, classId, subjectId })
    .onConflictDoNothing();
}

async function main() {
  console.log("→ Seeding establishment");
  const establishment = await ensureEstablishment(
    "Établissement de démonstration",
  );

  console.log("→ Seeding users");
  const adminId = await ensureUser({
    email: "admin@passerelle.local",
    password: "Admin123!",
    firstName: "Admin",
    lastName: "Principal",
    role: "admin",
  });
  const managerId = await ensureUser({
    email: "manager@passerelle.local",
    password: "Manager123!",
    firstName: "Sophie",
    lastName: "Bernard",
    role: "manager",
    establishmentId: establishment.id,
  });
  const teacherId = await ensureUser({
    email: "teacher@passerelle.local",
    password: "Teacher123!",
    firstName: "Marie",
    lastName: "Dupont",
    role: "teacher",
    establishmentId: establishment.id,
  });
  const studentId = await ensureUser({
    email: "student@passerelle.local",
    password: "Student123!",
    firstName: "Lucas",
    lastName: "Martin",
    role: "student",
    establishmentId: establishment.id,
  });

  console.log("→ Assigning manager to establishment");
  await db
    .update(schema.establishments)
    .set({ managerId })
    .where(eq(schema.establishments.id, establishment.id));

  console.log("→ Seeding academic year");
  const year = await ensureAcademicYear("2025-2026");

  console.log("→ Seeding subjects");
  const maths = await ensureSubject("Mathématiques", establishment.id);
  const french = await ensureSubject("Français", establishment.id);
  const history = await ensureSubject("Histoire", establishment.id);

  console.log("→ Seeding classes");
  const classA = await ensureClass({
    name: "3ème A",
    level: "3ème",
    yearId: year.id,
    establishmentId: establishment.id,
  });
  const classB = await ensureClass({
    name: "4ème B",
    level: "4ème",
    yearId: year.id,
    establishmentId: establishment.id,
  });

  console.log("→ Linking subjects to classes");
  for (const c of [classA, classB]) {
    for (const s of [maths, french, history]) {
      await ensureClassSubject(c.id, s.id);
    }
  }

  console.log("→ Assigning teacher → 3ème A + Maths");
  await ensureTeacherAssignment(teacherId, classA.id, maths.id);

  console.log("→ Enrolling student in 3ème A, granting access to Maths only");
  await ensureStudentEnrollment(studentId, classA.id);
  await ensureStudentSubjectAccess(studentId, classA.id, maths.id);

  console.log("\nDone.");
  console.log("Admin    : admin@passerelle.local / Admin123!");
  console.log("Manager  : manager@passerelle.local / Manager123!");
  console.log("Teacher  : teacher@passerelle.local / Teacher123!");
  console.log("Student  : student@passerelle.local / Student123!");
  console.log(
    `(adminId=${adminId}, managerId=${managerId}, teacherId=${teacherId}, studentId=${studentId})`,
  );
}

main()
  .then(() => client.end({ timeout: 5 }))
  .catch(async (err) => {
    console.error(err);
    await client.end({ timeout: 5 });
    process.exit(1);
  });
