import Link from "next/link";
import { db } from "@/lib/db";
import {
  studentSubjectAccess,
  subjects,
  classes,
  chapters,
  resources,
} from "@/lib/db/schema";
import { and, count, eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/auth/permissions";
import { isWithinResourceWindow } from "@/lib/auth/student-access";

export const metadata = { title: "Élève · Mes matières" };
export const dynamic = "force-dynamic";

export default async function StudentSubjectsPage() {
  const user = await requireRole("student");

  const rows = await db
    .select({
      classId: studentSubjectAccess.classId,
      subjectId: studentSubjectAccess.subjectId,
      className: classes.name,
      subjectName: subjects.name,
      subjectDescription: subjects.description,
      resourceCount: count(resources.id),
    })
    .from(studentSubjectAccess)
    .innerJoin(subjects, eq(subjects.id, studentSubjectAccess.subjectId))
    .innerJoin(classes, eq(classes.id, studentSubjectAccess.classId))
    .leftJoin(
      chapters,
      and(
        eq(chapters.classId, studentSubjectAccess.classId),
        eq(chapters.subjectId, studentSubjectAccess.subjectId),
      ),
    )
    .leftJoin(
      resources,
      and(eq(resources.chapterId, chapters.id), isWithinResourceWindow()!),
    )
    .where(eq(studentSubjectAccess.studentId, user.id))
    .groupBy(
      studentSubjectAccess.classId,
      studentSubjectAccess.subjectId,
      classes.name,
      subjects.name,
      subjects.description,
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mes matières</h1>
        <p className="text-sm text-zinc-500">
          {rows.length} matière{rows.length > 1 ? "s" : ""} autorisée
          {rows.length > 1 ? "s" : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-zinc-500">
            Aucune matière autorisée pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => (
            <Link
              key={`${r.classId}-${r.subjectId}`}
              href={`/student/subjects/${r.subjectId}`}
              className="block"
            >
              <Card className="h-full transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                <CardHeader>
                  <CardTitle>{r.subjectName}</CardTitle>
                  <p className="text-xs text-zinc-500">{r.className}</p>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {r.subjectDescription ? (
                    <p className="line-clamp-2 text-zinc-600 dark:text-zinc-400">
                      {r.subjectDescription}
                    </p>
                  ) : null}
                  <p className="text-zinc-500">
                    {r.resourceCount} ressource
                    {r.resourceCount > 1 ? "s" : ""} publiée
                    {r.resourceCount > 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
