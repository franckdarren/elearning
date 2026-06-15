import Link from "next/link";
import { db } from "@/lib/db";
import {
  teacherAssignments,
  classes,
  subjects,
  resources,
  quizzes,
  chapters,
  studentEnrollments,
} from "@/lib/db/schema";
import { and, count, eq, inArray, or, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/permissions";

export const metadata = { title: "Enseignant · Tableau de bord" };
export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const user = await requireRole(["admin", "teacher"]);

  const myAssignments = await db
    .select({
      classId: teacherAssignments.classId,
      subjectId: teacherAssignments.subjectId,
      className: classes.name,
      subjectName: subjects.name,
    })
    .from(teacherAssignments)
    .innerJoin(classes, eq(classes.id, teacherAssignments.classId))
    .innerJoin(subjects, eq(subjects.id, teacherAssignments.subjectId))
    .where(eq(teacherAssignments.teacherId, user.id));

  let videoCount = 0;
  let quizCount = 0;
  let studentCount = 0;

  if (myAssignments.length > 0) {
    const scope = or(
      ...myAssignments.map(
        (a) =>
          and(
            eq(chapters.classId, a.classId),
            eq(chapters.subjectId, a.subjectId),
          )!,
      ),
    );
    const chapterIds = (
      await db.select({ id: chapters.id }).from(chapters).where(scope)
    ).map((c) => c.id);

    if (chapterIds.length > 0) {
      const [{ value: v }] = await db
        .select({ value: count() })
        .from(resources)
        .where(
          and(
            inArray(resources.chapterId, chapterIds),
            eq(resources.type, "video"),
          ),
        );
      videoCount = v;
    }

    const quizScope = or(
      ...myAssignments.map(
        (a) =>
          and(
            eq(quizzes.classId, a.classId),
            eq(quizzes.subjectId, a.subjectId),
          )!,
      ),
    );
    const [{ value: q }] = await db
      .select({ value: count() })
      .from(quizzes)
      .where(quizScope);
    quizCount = q;

    const classIds = Array.from(new Set(myAssignments.map((a) => a.classId)));
    const [{ value: s }] = await db
      .select({
        value:
          sql<number>`count(distinct ${studentEnrollments.studentId})`.mapWith(
            Number,
          ),
      })
      .from(studentEnrollments)
      .where(inArray(studentEnrollments.classId, classIds));
    studentCount = s;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Bonjour {user.fullName || user.email}
        </h1>
        <p className="text-sm text-zinc-500">
          {myAssignments.length} affectation
          {myAssignments.length > 1 ? "s" : ""} · {studentCount} élève
          {studentCount > 1 ? "s" : ""} suivi{studentCount > 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Affectations", myAssignments.length],
          ["Élèves suivis", studentCount],
          ["Vidéos", videoCount],
          ["QCM", quizCount],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-500">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes classes et matières</CardTitle>
        </CardHeader>
        <CardContent>
          {myAssignments.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune affectation pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              {myAssignments.map((a) => (
                <li
                  key={`${a.classId}-${a.subjectId}`}
                  className="flex justify-between py-2"
                >
                  <span>{a.className}</span>
                  <Link
                    href={`/teacher/content?classId=${a.classId}&subjectId=${a.subjectId}`}
                    className="text-zinc-500 hover:underline"
                  >
                    {a.subjectName} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
