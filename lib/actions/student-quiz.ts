"use server";

import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  questions,
  questionOptions,
  quizAttempts,
  quizAnswers,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { studentPlayableQuiz } from "@/lib/auth/student-access";
import { scoreQuiz, type ScoringQuestion } from "@/lib/quiz-scoring";

export type QuestionForPlay = {
  id: string;
  type: "single" | "multiple" | "true_false";
  text: string;
  points: number;
  position: number;
  options: Array<{ id: string; text: string; position: number }>;
};

export type QuizForPlay = {
  ok: true;
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  attemptsLeft: number;
  questions: QuestionForPlay[];
};

export type QuizForPlayError = { ok: false; error: string };

export async function loadQuizForPlay(
  quizId: string,
): Promise<QuizForPlay | QuizForPlayError> {
  const user = await requireRole("student");
  const quiz = await studentPlayableQuiz(user.id, quizId);
  if (!quiz) return { ok: false, error: "Quiz indisponible" };

  const [{ done }] = await db
    .select({ done: count() })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.quizId, quizId),
        eq(quizAttempts.studentId, user.id),
      ),
    );
  const max = quiz.maxAttempts ?? 1;
  const attemptsLeft = Math.max(0, max - done);
  if (attemptsLeft === 0) {
    return { ok: false, error: "Plus de tentatives disponibles" };
  }

  const qRows = await db
    .select({
      id: questions.id,
      type: questions.type,
      text: questions.text,
      points: questions.points,
      position: questions.position,
    })
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questions.position));

  const oRows = await db
    .select({
      id: questionOptions.id,
      questionId: questionOptions.questionId,
      text: questionOptions.text,
      position: questionOptions.position,
    })
    .from(questionOptions)
    .innerJoin(questions, eq(questions.id, questionOptions.questionId))
    .where(eq(questions.quizId, quizId))
    .orderBy(asc(questionOptions.position));

  const optionsByQuestion = new Map<string, QuestionForPlay["options"]>();
  for (const o of oRows) {
    if (!optionsByQuestion.has(o.questionId)) {
      optionsByQuestion.set(o.questionId, []);
    }
    optionsByQuestion.get(o.questionId)!.push({
      id: o.id,
      text: o.text,
      position: o.position,
    });
  }

  return {
    ok: true,
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    durationMinutes: quiz.durationMinutes,
    attemptsLeft,
    questions: qRows.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      points: Number(q.points ?? 1),
      position: q.position,
      options: optionsByQuestion.get(q.id) ?? [],
    })),
  };
}

export type SubmitAnswerInput = {
  questionId: string;
  selectedOptionIds: string[];
};

export type CorrectedQuestion = {
  questionId: string;
  awardedPoints: number;
  maxPoints: number;
  correctOptionIds: string[];
  selectedOptionIds: string[];
};

export type SubmitResult =
  | {
      ok: true;
      attemptId: string;
      score: number;
      maxScore: number;
      questions: CorrectedQuestion[];
    }
  | { ok: false; error: string };

export async function submitQuizAttempt(
  quizId: string,
  answers: SubmitAnswerInput[],
): Promise<SubmitResult> {
  const user = await requireRole("student");
  const quiz = await studentPlayableQuiz(user.id, quizId);
  if (!quiz) return { ok: false, error: "Quiz indisponible" };

  const [{ done }] = await db
    .select({ done: count() })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.quizId, quizId),
        eq(quizAttempts.studentId, user.id),
      ),
    );
  const max = quiz.maxAttempts ?? 1;
  if (done >= max) return { ok: false, error: "Plus de tentatives" };

  // Server-side authoritative data for scoring.
  const qRows = await db
    .select({
      id: questions.id,
      type: questions.type,
      points: questions.points,
    })
    .from(questions)
    .where(eq(questions.quizId, quizId));
  const optRows = await db
    .select({
      id: questionOptions.id,
      questionId: questionOptions.questionId,
      isCorrect: questionOptions.isCorrect,
    })
    .from(questionOptions)
    .innerJoin(questions, eq(questions.id, questionOptions.questionId))
    .where(eq(questions.quizId, quizId));

  const optionsByQuestion = new Map<string, ScoringQuestion["options"]>();
  for (const o of optRows) {
    if (!optionsByQuestion.has(o.questionId)) {
      optionsByQuestion.set(o.questionId, []);
    }
    optionsByQuestion.get(o.questionId)!.push({
      id: o.id,
      isCorrect: o.isCorrect,
    });
  }

  const scoringQuestions: ScoringQuestion[] = qRows.map((q) => ({
    id: q.id,
    points: Number(q.points ?? 1),
    options: optionsByQuestion.get(q.id) ?? [],
  }));

  const { score, maxScore, questions: corrected } = scoreQuiz(
    scoringQuestions,
    answers,
  );

  const [{ id: attemptId }] = await db
    .insert(quizAttempts)
    .values({
      quizId,
      studentId: user.id,
      score: String(score),
      maxScore: String(maxScore),
      submittedAt: new Date(),
    })
    .returning({ id: quizAttempts.id });

  if (corrected.length > 0) {
    await db.insert(quizAnswers).values(
      corrected.map((c) => ({
        attemptId,
        questionId: c.questionId,
        selectedOptionIds: c.selectedOptionIds,
      })),
    );
  }

  return { ok: true, attemptId, score, maxScore, questions: corrected };
}
