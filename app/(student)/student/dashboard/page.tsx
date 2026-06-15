import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  studentSubjectAccess,
  subjects,
  classes,
  chapters,
  resources,
  progress,
  quizAttempts,
  quizzes,
} from "@/lib/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/permissions";
import { isWithinResourceWindow } from "@/lib/auth/student-access";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Élève · Tableau de bord" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireRole("student");

  // 1) Access list (class, subject).
  const access = await db
    .select({
      classId: studentSubjectAccess.classId,
      subjectId: studentSubjectAccess.subjectId,
      subjectName: subjects.name,
      className: classes.name,
    })
    .from(studentSubjectAccess)
    .innerJoin(subjects, eq(subjects.id, studentSubjectAccess.subjectId))
    .innerJoin(classes, eq(classes.id, studentSubjectAccess.classId))
    .where(eq(studentSubjectAccess.studentId, user.id));

  // 2) Per-subject totals (resources published) + watched count for this student.
  const perSubject = await Promise.all(
    access.map(async (a) => {
      const [{ totalPublished }] = await db
        .select({ totalPublished: sql<number>`count(${resources.id})`.mapWith(Number) })
        .from(resources)
        .innerJoin(chapters, eq(chapters.id, resources.chapterId))
        .where(
          and(
            eq(chapters.classId, a.classId),
            eq(chapters.subjectId, a.subjectId),
            isWithinResourceWindow()!,
          ),
        );

      const [{ done }] = await db
        .select({ done: sql<number>`count(${progress.id})`.mapWith(Number) })
        .from(progress)
        .innerJoin(resources, eq(resources.id, progress.resourceId))
        .innerJoin(chapters, eq(chapters.id, resources.chapterId))
        .where(
          and(
            eq(progress.studentId, user.id),
            eq(progress.watched, true),
            eq(chapters.classId, a.classId),
            eq(chapters.subjectId, a.subjectId),
          ),
        );

      return {
        ...a,
        totalPublished,
        done,
        pct:
          totalPublished > 0 ? Math.round((done / totalPublished) * 100) : 0,
      };
    }),
  );

  const totalPublished = perSubject.reduce((s, x) => s + x.totalPublished, 0);
  const totalDone = perSubject.reduce((s, x) => s + x.done, 0);
  const globalPct =
    totalPublished > 0 ? Math.round((totalDone / totalPublished) * 100) : 0;

  // 3) Last attempts (5 most recent).
  const lastAttempts = await db
    .select({
      id: quizAttempts.id,
      title: quizzes.title,
      score: quizAttempts.score,
      maxScore: quizAttempts.maxScore,
      submittedAt: quizAttempts.submittedAt,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .where(eq(quizAttempts.studentId, user.id))
    .orderBy(desc(quizAttempts.submittedAt))
    .limit(5);

  // 4) Last resources viewed (5 most recent watched).
  const lastWatched = await db
    .select({
      resourceId: progress.resourceId,
      title: resources.title,
      type: resources.type,
      completedAt: progress.completedAt,
      chapterId: resources.chapterId,
    })
    .from(progress)
    .innerJoin(resources, eq(resources.id, progress.resourceId))
    .where(and(eq(progress.studentId, user.id), eq(progress.watched, true)))
    .orderBy(desc(progress.completedAt))
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Bonjour {user.fullName || user.email}
        </h1>
        <p className="text-sm text-zinc-500">
          Progression globale : {globalPct} %
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500">
              Matières autorisées
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {access.length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500">
              Ressources vues
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totalDone} / {totalPublished}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500">
              Quiz passés
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {lastAttempts.length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progression par matière</CardTitle>
        </CardHeader>
        <CardContent>
          {perSubject.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune matière autorisée pour le moment.
            </p>
          ) : (
            <ul className="space-y-3 text-sm">
              {perSubject.map((s) => (
                <li
                  key={`${s.classId}-${s.subjectId}`}
                  className="space-y-1"
                >
                  <div className="flex justify-between">
                    <Link
                      href={`/student/subjects/${s.subjectId}`}
                      className="font-medium hover:underline"
                    >
                      {s.subjectName}
                    </Link>
                    <span className="text-zinc-500">
                      {s.done} / {s.totalPublished} ({s.pct} %)
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full bg-zinc-900 dark:bg-zinc-100"
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dernières ressources vues</CardTitle>
          </CardHeader>
          <CardContent>
            {lastWatched.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucune activité.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lastWatched.map((r) => (
                  <li key={r.resourceId} className="flex justify-between">
                    <Link
                      href={`/student/chapter/${r.chapterId}`}
                      className="hover:underline"
                    >
                      {r.title}
                    </Link>
                    <Badge variant="outline">
                      {r.type === "video" ? "Vidéo" : "Doc"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Derniers quiz</CardTitle>
          </CardHeader>
          <CardContent>
            {lastAttempts.length === 0 ? (
              <p className="text-sm text-zinc-500">Aucun quiz passé.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lastAttempts.map((a) => {
                  const score = a.score == null ? 0 : Number(a.score);
                  const max = a.maxScore == null ? 0 : Number(a.maxScore);
                  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
                  return (
                    <li key={a.id} className="flex justify-between">
                      <Link
                        href={`/student/results/${a.id}`}
                        className="hover:underline"
                      >
                        {a.title}
                      </Link>
                      <span className="text-zinc-500">{pct} %</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
