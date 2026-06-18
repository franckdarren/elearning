import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { db } from "@/lib/db";
import {
  quizzes,
  classes,
  subjects,
  chapters,
  questions,
  questionOptions,
  teacherAssignments,
} from "@/lib/db/schema";
import { asc, eq, and } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/permissions";
import { assertWriteScope } from "@/lib/auth/scope";
import { QuizDialog } from "../../quiz-dialog";
import { AddQuestionButtons } from "./add-question-buttons";
import { QuestionRow } from "./question-row";

export const metadata = { title: "Enseignant · Édition QCM" };
export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  draft: "Brouillon",
  scheduled: "Programmé",
  published: "Publié",
  archived: "Archivé",
} as const;

export default async function QuizEditPage({
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
      chapterId: quizzes.chapterId,
      durationMinutes: quizzes.durationMinutes,
      maxAttempts: quizzes.maxAttempts,
      opensAt: quizzes.opensAt,
      closesAt: quizzes.closesAt,
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

  // Reload assignments & chapters for the settings dialog.
  const assignments = await db
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

  const chaptersList = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      classId: chapters.classId,
      subjectId: chapters.subjectId,
    })
    .from(chapters)
    .where(
      and(eq(chapters.classId, quiz.classId), eq(chapters.subjectId, quiz.subjectId)),
    )
    .orderBy(asc(chapters.title));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-sm text-zinc-500">
          <Link href="/teacher/quizzes" className="hover:underline">
            ← Liste des QCM
          </Link>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{quiz.title}</h1>
            <p className="text-sm text-zinc-500">
              {quiz.className} — {quiz.subjectName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={quiz.status === "published" ? "default" : "outline"}
            >
              {STATUS_LABEL[quiz.status]}
            </Badge>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/teacher/quizzes/${quizId}/preview`}>
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Prévisualiser
              </Link>
            </Button>
            <QuizDialog
              assignments={assignments}
              chapters={chaptersList}
              quiz={quiz}
              trigger={
                <Button variant="outline" size="sm">
                  Paramètres
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>
            {questionRows.length} question{questionRows.length > 1 ? "s" : ""}
          </CardTitle>
          <AddQuestionButtons quizId={quizId} />
        </CardHeader>
        <CardContent className="space-y-4">
          {questionRows.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Ajoutez une première question pour commencer.
            </p>
          ) : (
            questionRows.map((q, idx) => (
              <QuestionRow
                key={q.id}
                quizId={quizId}
                question={{
                  id: q.id,
                  type: q.type,
                  text: q.text,
                  points: q.points as string | null,
                  position: q.position,
                }}
                options={(optionsByQuestion.get(q.id) ?? []).map((r) => ({
                  id: r.question_options.id,
                  text: r.question_options.text,
                  isCorrect: r.question_options.isCorrect,
                  position: r.question_options.position,
                }))}
                index={idx}
                isFirst={idx === 0}
                isLast={idx === questionRows.length - 1}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
