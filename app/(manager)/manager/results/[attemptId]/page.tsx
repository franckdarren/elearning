import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  quizAttempts,
  quizAnswers,
  quizzes,
  questions,
  questionOptions,
  profiles,
  classes,
  subjects,
} from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireEstablishment } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Gestionnaire · Détail tentative" };
export const dynamic = "force-dynamic";

const TYPE_LABEL = {
  single: "Choix unique",
  multiple: "Choix multiples",
  true_false: "Vrai / Faux",
} as const;

export default async function ManagerAttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await requireEstablishment();
  const { attemptId } = await params;

  const [attempt] = await db
    .select({
      id: quizAttempts.id,
      quizId: quizAttempts.quizId,
      score: quizAttempts.score,
      maxScore: quizAttempts.maxScore,
      startedAt: quizAttempts.startedAt,
      submittedAt: quizAttempts.submittedAt,
      quizTitle: quizzes.title,
      classId: quizzes.classId,
      subjectId: quizzes.subjectId,
      establishmentId: classes.establishmentId,
      className: classes.name,
      subjectName: subjects.name,
      studentFirstName: profiles.firstName,
      studentLastName: profiles.lastName,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .innerJoin(classes, eq(classes.id, quizzes.classId))
    .innerJoin(subjects, eq(subjects.id, quizzes.subjectId))
    .innerJoin(profiles, eq(profiles.id, quizAttempts.studentId))
    .where(eq(quizAttempts.id, attemptId))
    .limit(1);

  if (!attempt) notFound();
  // Cloisonnement : la tentative doit relever de l'établissement du gestionnaire.
  if (attempt.establishmentId !== user.establishmentId) notFound();

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, attempt.quizId))
    .orderBy(asc(questions.position));

  const optionRows = await db
    .select()
    .from(questionOptions)
    .innerJoin(questions, eq(questions.id, questionOptions.questionId))
    .where(eq(questions.quizId, attempt.quizId))
    .orderBy(asc(questionOptions.position));

  const answerRows = await db
    .select()
    .from(quizAnswers)
    .where(eq(quizAnswers.attemptId, attemptId));

  const optionsByQuestion = new Map<string, typeof optionRows>();
  for (const row of optionRows) {
    const qid = row.question_options.questionId;
    if (!optionsByQuestion.has(qid)) optionsByQuestion.set(qid, []);
    optionsByQuestion.get(qid)!.push(row);
  }

  const answerByQuestion = new Map<string, string[]>();
  for (const a of answerRows) {
    answerByQuestion.set(a.questionId, a.selectedOptionIds);
  }

  const score = attempt.score == null ? null : Number(attempt.score);
  const maxScore = attempt.maxScore == null ? null : Number(attempt.maxScore);
  const pct =
    score != null && maxScore != null && maxScore > 0
      ? Math.round((score / maxScore) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-sm text-zinc-500">
          <Link href="/manager/results" className="hover:underline">
            ← Résultats
          </Link>
        </div>
        <h1 className="text-2xl font-semibold">
          {attempt.studentFirstName} {attempt.studentLastName}
        </h1>
        <p className="text-sm text-zinc-500">
          {attempt.quizTitle} · {attempt.className} — {attempt.subjectName}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500">Score</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-semibold">
              {pct != null ? `${pct} %` : "—"}
            </span>
            {score != null && maxScore != null && (
              <span className="ml-2 text-sm text-zinc-500">
                ({score}/{maxScore} pts)
              </span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500">Soumis le</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {attempt.submittedAt
              ? new Date(attempt.submittedAt).toLocaleString("fr-FR")
              : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-zinc-500">Questions</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {questionRows.length}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {questionRows.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-zinc-500">
              Aucune question enregistrée pour ce quiz.
            </CardContent>
          </Card>
        ) : (
          questionRows.map((q, idx) => {
            const opts = (optionsByQuestion.get(q.id) ?? []).map(
              (r) => r.question_options,
            );
            const selectedIds = answerByQuestion.get(q.id) ?? [];
            const correctIds = opts.filter((o) => o.isCorrect).map((o) => o.id);
            const isCorrect =
              selectedIds.length === correctIds.length &&
              selectedIds.every((id) => correctIds.includes(id));

            return (
              <Card key={q.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-sm font-semibold text-zinc-400">
                        Q{idx + 1}
                      </span>
                      <div>
                        <p className="font-medium">{q.text}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABEL[q.type]}
                          </Badge>
                          <span className="text-xs text-zinc-500">
                            {q.points ?? 1} pt
                            {Number(q.points ?? 1) > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={isCorrect ? "default" : "destructive"}>
                      {isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {opts.map((o) => {
                      const selected = selectedIds.includes(o.id);
                      const correct = o.isCorrect;
                      return (
                        <li
                          key={o.id}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                            selected && correct
                              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : selected && !correct
                                ? "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300"
                                : !selected && correct
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
                                  : "text-zinc-600 dark:text-zinc-400",
                          )}
                        >
                          <span className="w-4 shrink-0 text-center font-semibold">
                            {selected && correct
                              ? "✓"
                              : selected && !correct
                                ? "✗"
                                : !selected && correct
                                  ? "→"
                                  : ""}
                          </span>
                          <span className="flex-1">{o.text}</span>
                          {selected && !correct && (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-xs text-red-600"
                            >
                              Réponse élève
                            </Badge>
                          )}
                          {selected && correct && (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-xs text-emerald-600"
                            >
                              Réponse élève ✓
                            </Badge>
                          )}
                          {!selected && correct && (
                            <Badge
                              variant="outline"
                              className="shrink-0 text-xs text-blue-600"
                            >
                              Bonne réponse
                            </Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
