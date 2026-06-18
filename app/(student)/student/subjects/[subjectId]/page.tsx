import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  studentSubjectAccess,
  subjects,
  classes,
  chapters,
  resources,
  quizzes,
} from "@/lib/db/schema";
import { and, asc, count, eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/permissions";
import {
  isQuizOpen,
  isWithinResourceWindow,
} from "@/lib/auth/student-access";

export const metadata = { title: "Élève · Matière" };
export const dynamic = "force-dynamic";

export default async function StudentSubjectPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const user = await requireRole("student");
  const { subjectId } = await params;

  const [access] = await db
    .select({
      classId: studentSubjectAccess.classId,
      subjectId: studentSubjectAccess.subjectId,
      subjectName: subjects.name,
      className: classes.name,
    })
    .from(studentSubjectAccess)
    .innerJoin(subjects, eq(subjects.id, studentSubjectAccess.subjectId))
    .innerJoin(classes, eq(classes.id, studentSubjectAccess.classId))
    .where(
      and(
        eq(studentSubjectAccess.studentId, user.id),
        eq(studentSubjectAccess.subjectId, subjectId),
      ),
    )
    .limit(1);
  if (!access) notFound();

  const chapterRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      position: chapters.position,
      resourceCount: count(resources.id),
    })
    .from(chapters)
    .leftJoin(
      resources,
      and(eq(resources.chapterId, chapters.id), isWithinResourceWindow()!),
    )
    .where(
      and(
        eq(chapters.classId, access.classId),
        eq(chapters.subjectId, access.subjectId),
      ),
    )
    .groupBy(chapters.id)
    .orderBy(asc(chapters.position));

  const quizzesRows = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      closesAt: quizzes.closesAt,
    })
    .from(quizzes)
    .where(
      and(
        eq(quizzes.classId, access.classId),
        eq(quizzes.subjectId, access.subjectId),
        isQuizOpen()!,
      ),
    )
    .orderBy(asc(quizzes.title));

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-zinc-500">
          <Link href="/student/subjects" className="hover:underline">
            ← Mes matières
          </Link>
        </div>
        <h1 className="text-2xl font-semibold">{access.subjectName}</h1>
        <p className="text-sm text-zinc-500">{access.className}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Chapitres</h2>
        {chapterRows.filter((c) => c.resourceCount > 0).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-zinc-500">
              Aucun chapitre publié pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {chapterRows
              .filter((c) => c.resourceCount > 0)
              .map((c) => (
                <Link key={c.id} href={`/student/chapter/${c.id}`}>
                  <Card className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                      <span className="min-w-0 flex-1 font-medium">{c.title}</span>
                      <Badge variant="outline" className="shrink-0">
                        {c.resourceCount} ressource
                        {c.resourceCount > 1 ? "s" : ""}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        )}
      </section>

      {quizzesRows.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">QCM disponibles</h2>
          <div className="grid gap-3">
            {quizzesRows.map((q) => (
              <Link key={q.id} href={`/student/quiz/${q.id}`}>
                <Card className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <CardContent className="flex items-center justify-between p-4">
                    <span className="font-medium">{q.title}</span>
                    {q.closesAt ? (
                      <span className="text-xs text-zinc-500">
                        Ferme le{" "}
                        {new Date(q.closesAt).toLocaleString("fr-FR")}
                      </span>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
