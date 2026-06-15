import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  quizAttempts,
  quizAnswers,
  quizzes,
  questions,
  questionOptions,
} from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/permissions";

export const metadata = { title: "Élève · Détail tentative" };
export const dynamic = "force-dynamic";

export default async function StudentAttemptDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const user = await requireRole("student");
  const { attemptId } = await params;

  const [attempt] = await db
    .select({
      id: quizAttempts.id,
      quizId: quizAttempts.quizId,
      score: quizAttempts.score,
      maxScore: quizAttempts.maxScore,
      submittedAt: quizAttempts.submittedAt,
      quizTitle: quizzes.title,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .where(
      and(
        eq(quizAttempts.id, attemptId),
        eq(quizAttempts.studentId, user.id),
      ),
    )
    .limit(1);
  if (!attempt) notFound();

  const [qRows, oRows, aRows] = await Promise.all([
    db
      .select()
      .from(questions)
      .where(eq(questions.quizId, attempt.quizId))
      .orderBy(asc(questions.position)),
    db
      .select({
        id: questionOptions.id,
        questionId: questionOptions.questionId,
        text: questionOptions.text,
        isCorrect: questionOptions.isCorrect,
        position: questionOptions.position,
      })
      .from(questionOptions)
      .innerJoin(questions, eq(questions.id, questionOptions.questionId))
      .where(eq(questions.quizId, attempt.quizId))
      .orderBy(asc(questionOptions.position)),
    db
      .select()
      .from(quizAnswers)
      .where(eq(quizAnswers.attemptId, attemptId)),
  ]);

  const optionsByQ = new Map<string, typeof oRows>();
  for (const o of oRows) {
    if (!optionsByQ.has(o.questionId)) optionsByQ.set(o.questionId, []);
    optionsByQ.get(o.questionId)!.push(o);
  }
  const selectedByQ = new Map<string, string[]>();
  for (const a of aRows) {
    selectedByQ.set(a.questionId, a.selectedOptionIds ?? []);
  }

  const score = attempt.score == null ? 0 : Number(attempt.score);
  const max = attempt.maxScore == null ? 0 : Number(attempt.maxScore);
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-zinc-500">
          <Link href="/student/results" className="hover:underline">
            ← Mes résultats
          </Link>
        </div>
        <h1 className="text-2xl font-semibold">{attempt.quizTitle}</h1>
        <p className="text-sm text-zinc-500">
          {attempt.submittedAt
            ? new Date(attempt.submittedAt).toLocaleString("fr-FR")
            : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">
          {score} / {max}{" "}
          <span className="text-base font-normal text-zinc-500">({pct} %)</span>
        </CardContent>
      </Card>

      {qRows.map((q, idx) => {
        const opts = optionsByQ.get(q.id) ?? [];
        const selected = new Set(selectedByQ.get(q.id) ?? []);
        return (
          <Card key={q.id}>
            <CardHeader>
              <CardTitle className="text-base">
                Q{idx + 1}. {q.text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm">
                {opts.map((o) => {
                  const isSelected = selected.has(o.id);
                  return (
                    <li
                      key={o.id}
                      className={
                        o.isCorrect
                          ? "rounded border border-emerald-300 bg-emerald-50 px-2 py-1 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                          : isSelected
                            ? "rounded border border-red-300 bg-red-50 px-2 py-1 dark:border-red-900/60 dark:bg-red-950/30"
                            : "px-2 py-1"
                      }
                    >
                      <span className="mr-2 text-xs text-zinc-500">
                        {isSelected ? "→" : "  "}
                      </span>
                      {o.text}
                      {o.isCorrect ? (
                        <Badge variant="default" className="ml-2">
                          Correct
                        </Badge>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
