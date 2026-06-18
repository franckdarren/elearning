import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  classes,
  questionOptions,
  questions,
  quizzes,
  subjects,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { assertWriteScope } from "@/lib/auth/scope";
import { Button } from "@/components/ui/button";
import { QuizPreview } from "@/components/teacher/quiz-preview";
import { Pencil } from "lucide-react";

export const metadata = { title: "Enseignant · Prévisualisation QCM" };
export const dynamic = "force-dynamic";

export default async function QuizPreviewPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const user = await requireRole(["admin", "teacher"]);
  const { quizId } = await params;

  const [quiz] = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      description: quizzes.description,
      classId: quizzes.classId,
      subjectId: quizzes.subjectId,
      durationMinutes: quizzes.durationMinutes,
      maxAttempts: quizzes.maxAttempts,
      status: quizzes.status,
      className: classes.name,
      subjectName: subjects.name,
    })
    .from(quizzes)
    .innerJoin(classes, eq(classes.id, quizzes.classId))
    .innerJoin(subjects, eq(subjects.id, quizzes.subjectId))
    .where(eq(quizzes.id, quizId))
    .limit(1);
  if (!quiz) notFound();
  await assertWriteScope(user, quiz.classId, quiz.subjectId);

  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questions.position));

  const optionRows = await db
    .select()
    .from(questionOptions)
    .innerJoin(questions, eq(questions.id, questionOptions.questionId))
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questionOptions.position));

  const optionsByQuestion = new Map<string, typeof optionRows>();
  for (const r of optionRows) {
    const qid = r.question_options.questionId;
    if (!optionsByQuestion.has(qid)) optionsByQuestion.set(qid, []);
    optionsByQuestion.get(qid)!.push(r);
  }

  const questionsForPreview = questionRows.map((q) => ({
    id: q.id,
    type: q.type,
    text: q.text,
    points: q.points as string | null,
    options: (optionsByQuestion.get(q.id) ?? []).map((r) => ({
      id: r.question_options.id,
      text: r.question_options.text,
      isCorrect: r.question_options.isCorrect,
      position: r.question_options.position,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <Link href="/teacher/quizzes" className="hover:underline">
            ← Liste des QCM
          </Link>
          <span>/</span>
          <Link
            href={`/teacher/quizzes/${quizId}/edit`}
            className="hover:underline"
          >
            {quiz.title}
          </Link>
          <span>/</span>
          <span>Prévisualisation</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            {quiz.className} — {quiz.subjectName}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/teacher/quizzes/${quizId}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Retour à l&apos;édition
            </Link>
          </Button>
        </div>
      </div>

      <QuizPreview
        title={quiz.title}
        description={quiz.description}
        durationMinutes={quiz.durationMinutes}
        maxAttempts={quiz.maxAttempts ?? 1}
        status={quiz.status}
        questions={questionsForPreview}
      />
    </div>
  );
}
