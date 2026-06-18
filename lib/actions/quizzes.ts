"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  quizzes,
  questions,
  questionOptions,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { assertWriteScope } from "@/lib/auth/scope";
import {
  quizInputSchema,
  questionInputSchema,
  optionInputSchema,
} from "@/lib/validations/quiz";

export type ActionState = { error?: string; success?: string } | null;

function tsOrNull(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function quizScopeById(quizId: string) {
  const [q] = await db
    .select({ classId: quizzes.classId, subjectId: quizzes.subjectId })
    .from(quizzes)
    .where(eq(quizzes.id, quizId))
    .limit(1);
  return q;
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------
export async function upsertQuiz(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireRole(["admin", "teacher", "manager"]);

    const rawChapterId = formData.get("chapterId") as string | null;
    const chapterId =
      !rawChapterId || rawChapterId === "none" ? undefined : rawChapterId;

    const parsed = quizInputSchema.safeParse({
      id: formData.get("id") || undefined,
      classId: formData.get("classId"),
      subjectId: formData.get("subjectId"),
      chapterId,
      title: formData.get("title"),
      description: formData.get("description"),
      durationMinutes: formData.get("durationMinutes") || undefined,
      maxAttempts: formData.get("maxAttempts") || 1,
      opensAt: formData.get("opensAt") ?? "",
      closesAt: formData.get("closesAt") ?? "",
      status: formData.get("status") ?? "draft",
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
    }
    const d = parsed.data;
    await assertWriteScope(user, d.classId, d.subjectId);

    if (d.id) {
      await db
        .update(quizzes)
        .set({
          title: d.title,
          description: d.description ?? null,
          chapterId: d.chapterId ?? null,
          durationMinutes: d.durationMinutes ?? null,
          maxAttempts: d.maxAttempts,
          opensAt: tsOrNull(d.opensAt),
          closesAt: tsOrNull(d.closesAt),
          status: d.status,
        })
        .where(eq(quizzes.id, d.id));
    } else {
      await db.insert(quizzes).values({
        classId: d.classId,
        subjectId: d.subjectId,
        chapterId: d.chapterId ?? null,
        title: d.title,
        description: d.description ?? null,
        durationMinutes: d.durationMinutes ?? null,
        maxAttempts: d.maxAttempts,
        opensAt: tsOrNull(d.opensAt),
        closesAt: tsOrNull(d.closesAt),
        status: d.status,
        createdBy: user.id,
      });
    }

    revalidatePath("/teacher/quizzes");
    if (d.id) revalidatePath(`/teacher/quizzes/${d.id}/edit`);
    return { success: d.id ? "Quiz mis à jour" : "Quiz créé" };
  } catch (err) {
    console.error("[upsertQuiz]", err);
    return { error: "Erreur serveur, veuillez réessayer." };
  }
}

export async function deleteQuiz(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const s = await quizScopeById(id);
  if (!s) return;
  await assertWriteScope(user, s.classId, s.subjectId);

  await db.delete(quizzes).where(eq(quizzes.id, id));
  revalidatePath("/teacher/quizzes");
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------
export async function addQuestion(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const parsed = questionInputSchema.safeParse({
    quizId: formData.get("quizId"),
    type: formData.get("type"),
    text: formData.get("text") || "Nouvelle question",
    points: formData.get("points") || 1,
  });
  if (!parsed.success) return;

  const s = await quizScopeById(parsed.data.quizId);
  if (!s) return;
  await assertWriteScope(user, s.classId, s.subjectId);

  const [{ next }] = await db
    .select({
      next: sql<number>`coalesce(max(${questions.position}), -1) + 1`.mapWith(
        Number,
      ),
    })
    .from(questions)
    .where(eq(questions.quizId, parsed.data.quizId));

  const [q] = await db
    .insert(questions)
    .values({
      quizId: parsed.data.quizId,
      type: parsed.data.type,
      text: parsed.data.text,
      points: String(parsed.data.points),
      position: next,
    })
    .returning({ id: questions.id });

  // For true_false, pre-seed Vrai / Faux options.
  if (parsed.data.type === "true_false") {
    await db.insert(questionOptions).values([
      { questionId: q.id, text: "Vrai", isCorrect: false, position: 0 },
      { questionId: q.id, text: "Faux", isCorrect: false, position: 1 },
    ]);
  }

  revalidatePath(`/teacher/quizzes/${parsed.data.quizId}/edit`);
}

export async function updateQuestion(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const parsed = questionInputSchema
    .extend({ id: questionInputSchema.shape.id.unwrap() })
    .safeParse({
      id: formData.get("id"),
      quizId: formData.get("quizId"),
      type: formData.get("type"),
      text: formData.get("text"),
      points: formData.get("points") || 1,
    });
  if (!parsed.success) return;
  const s = await quizScopeById(parsed.data.quizId);
  if (!s) return;
  await assertWriteScope(user, s.classId, s.subjectId);

  await db
    .update(questions)
    .set({
      type: parsed.data.type,
      text: parsed.data.text,
      points: String(parsed.data.points),
    })
    .where(eq(questions.id, parsed.data.id));

  revalidatePath(`/teacher/quizzes/${parsed.data.quizId}/edit`);
}

export async function deleteQuestion(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const id = String(formData.get("id") ?? "");
  const quizId = String(formData.get("quizId") ?? "");
  if (!id || !quizId) return;
  const s = await quizScopeById(quizId);
  if (!s) return;
  await assertWriteScope(user, s.classId, s.subjectId);

  await db.delete(questions).where(eq(questions.id, id));
  revalidatePath(`/teacher/quizzes/${quizId}/edit`);
}

export async function moveQuestion(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const id = String(formData.get("id") ?? "");
  const quizId = String(formData.get("quizId") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || !quizId || (direction !== "up" && direction !== "down")) return;

  const s = await quizScopeById(quizId);
  if (!s) return;
  await assertWriteScope(user, s.classId, s.subjectId);

  const allQuestions = await db
    .select({ id: questions.id, position: questions.position })
    .from(questions)
    .where(eq(questions.quizId, quizId))
    .orderBy(questions.position);

  const idx = allQuestions.findIndex((q) => q.id === id);
  if (idx === -1) return;

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= allQuestions.length) return;

  const current = allQuestions[idx];
  const neighbor = allQuestions[swapIdx];

  await db
    .update(questions)
    .set({ position: neighbor.position })
    .where(eq(questions.id, current.id));
  await db
    .update(questions)
    .set({ position: current.position })
    .where(eq(questions.id, neighbor.id));

  revalidatePath(`/teacher/quizzes/${quizId}/edit`);
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------
export async function addOption(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const questionId = String(formData.get("questionId") ?? "");
  const quizId = String(formData.get("quizId") ?? "");
  if (!questionId || !quizId) return;
  const s = await quizScopeById(quizId);
  if (!s) return;
  await assertWriteScope(user, s.classId, s.subjectId);

  const [{ next }] = await db
    .select({
      next: sql<number>`coalesce(max(${questionOptions.position}), -1) + 1`.mapWith(
        Number,
      ),
    })
    .from(questionOptions)
    .where(eq(questionOptions.questionId, questionId));

  await db
    .insert(questionOptions)
    .values({ questionId, text: "Nouvelle option", position: next });

  revalidatePath(`/teacher/quizzes/${quizId}/edit`);
}

export async function updateOption(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const parsed = optionInputSchema
    .extend({ id: optionInputSchema.shape.id.unwrap(), quizId: questionInputSchema.shape.quizId })
    .safeParse({
      id: formData.get("id"),
      questionId: formData.get("questionId"),
      quizId: formData.get("quizId"),
      text: formData.get("text"),
      isCorrect: formData.get("isCorrect") === "true",
    });
  if (!parsed.success) return;
  const s = await quizScopeById(parsed.data.quizId);
  if (!s) return;
  await assertWriteScope(user, s.classId, s.subjectId);

  await db
    .update(questionOptions)
    .set({ text: parsed.data.text, isCorrect: parsed.data.isCorrect })
    .where(eq(questionOptions.id, parsed.data.id));

  revalidatePath(`/teacher/quizzes/${parsed.data.quizId}/edit`);
}

export async function deleteOption(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const id = String(formData.get("id") ?? "");
  const quizId = String(formData.get("quizId") ?? "");
  if (!id || !quizId) return;
  const s = await quizScopeById(quizId);
  if (!s) return;
  await assertWriteScope(user, s.classId, s.subjectId);

  await db.delete(questionOptions).where(eq(questionOptions.id, id));
  revalidatePath(`/teacher/quizzes/${quizId}/edit`);
}
