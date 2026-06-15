import { db } from "@/lib/db";
import {
  quizAttempts,
  quizzes,
  profiles,
  classes,
  subjects,
  teacherAssignments,
} from "@/lib/db/schema";
import { and, asc, avg, count, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/permissions";

export const metadata = { title: "Enseignant · Résultats" };
export const dynamic = "force-dynamic";

function pct(score: number | null, max: number | null) {
  if (!score || !max || max === 0) return "—";
  return `${Math.round((score / max) * 100)} %`;
}

export default async function TeacherResultsPage() {
  const user = await requireRole(["admin", "teacher"]);

  const assignments = await db
    .select({
      classId: teacherAssignments.classId,
      subjectId: teacherAssignments.subjectId,
    })
    .from(teacherAssignments)
    .where(eq(teacherAssignments.teacherId, user.id));

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Résultats</h1>
        <Card>
          <CardContent className="p-6 text-sm text-zinc-500">
            Aucune affectation pour le moment.
          </CardContent>
        </Card>
      </div>
    );
  }

  const scope = or(
    ...assignments.map(
      (a) =>
        and(
          eq(quizzes.classId, a.classId),
          eq(quizzes.subjectId, a.subjectId),
        )!,
    ),
  );

  const [attempts, perQuiz] = await Promise.all([
    db
      .select({
        id: quizAttempts.id,
        quizId: quizAttempts.quizId,
        score: quizAttempts.score,
        maxScore: quizAttempts.maxScore,
        startedAt: quizAttempts.startedAt,
        submittedAt: quizAttempts.submittedAt,
        quizTitle: quizzes.title,
        studentFirstName: profiles.firstName,
        studentLastName: profiles.lastName,
        className: classes.name,
        subjectName: subjects.name,
      })
      .from(quizAttempts)
      .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
      .innerJoin(profiles, eq(profiles.id, quizAttempts.studentId))
      .innerJoin(classes, eq(classes.id, quizzes.classId))
      .innerJoin(subjects, eq(subjects.id, quizzes.subjectId))
      .where(scope)
      .orderBy(desc(quizAttempts.submittedAt), desc(quizAttempts.startedAt))
      .limit(100),
    db
      .select({
        quizId: quizzes.id,
        title: quizzes.title,
        attempts: count(quizAttempts.id),
        avgScore: sql<number | null>`avg(case when ${quizAttempts.maxScore} > 0 then ${quizAttempts.score} / ${quizAttempts.maxScore} else null end)`.mapWith(
          Number,
        ),
      })
      .from(quizzes)
      .leftJoin(quizAttempts, and(eq(quizAttempts.quizId, quizzes.id), isNotNull(quizAttempts.submittedAt)))
      .where(scope)
      .groupBy(quizzes.id)
      .orderBy(asc(quizzes.title)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Résultats</h1>
        <p className="text-sm text-zinc-500">
          Tentatives récentes sur vos QCM.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statistiques par quiz</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {perQuiz.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">Aucun quiz.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Tentatives</TableHead>
                  <TableHead>Moyenne</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perQuiz.map((q) => (
                  <TableRow key={q.quizId}>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell>{q.attempts}</TableCell>
                    <TableCell>
                      {q.avgScore == null
                        ? "—"
                        : `${Math.round(q.avgScore * 100)} %`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dernières tentatives</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {attempts.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              Aucune tentative pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élève</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Périmètre</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Soumis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.studentFirstName} {a.studentLastName}
                    </TableCell>
                    <TableCell>{a.quizTitle}</TableCell>
                    <TableCell className="text-zinc-500">
                      {a.className} — {a.subjectName}
                    </TableCell>
                    <TableCell>
                      {pct(
                        a.score == null ? null : Number(a.score),
                        a.maxScore == null ? null : Number(a.maxScore),
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {a.submittedAt
                        ? new Date(a.submittedAt).toLocaleString("fr-FR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
