"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sequences, chapters } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { assertWriteScope } from "@/lib/auth/scope";
import { sequenceInputSchema } from "@/lib/validations/sequence";

export type ActionState = { error?: string; success?: string } | null;

async function chapterScope(chapterId: string) {
  const [c] = await db
    .select({ classId: chapters.classId, subjectId: chapters.subjectId })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  return c;
}

export async function upsertSequence(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole(["admin", "teacher", "manager"]);

  const parsed = sequenceInputSchema.safeParse({
    id: formData.get("id") || undefined,
    chapterId: formData.get("chapterId"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }
  const { id, chapterId, title } = parsed.data;

  const c = await chapterScope(chapterId);
  if (!c) return { error: "Chapitre introuvable" };
  await assertWriteScope(user, c.classId, c.subjectId);

  if (id) {
    await db.update(sequences).set({ title }).where(eq(sequences.id, id));
  } else {
    const [{ next }] = await db
      .select({
        next: sql<number>`coalesce(max(${sequences.position}), -1) + 1`.mapWith(
          Number,
        ),
      })
      .from(sequences)
      .where(eq(sequences.chapterId, chapterId));
    await db
      .insert(sequences)
      .values({ chapterId, title, position: next });
  }

  revalidatePath(`/teacher/content/${chapterId}`);
  return { success: id ? "Séquence mise à jour" : "Séquence créée" };
}

export async function deleteSequence(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [row] = await db
    .select({ chapterId: sequences.chapterId })
    .from(sequences)
    .where(eq(sequences.id, id))
    .limit(1);
  if (!row) return;
  const c = await chapterScope(row.chapterId);
  if (!c) return;
  await assertWriteScope(user, c.classId, c.subjectId);

  await db.delete(sequences).where(eq(sequences.id, id));
  revalidatePath(`/teacher/content/${row.chapterId}`);
}
