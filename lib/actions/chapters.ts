"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { assertWriteScope } from "@/lib/auth/scope";
import { chapterInputSchema } from "@/lib/validations/chapter";

export type ActionState = { error?: string; success?: string } | null;

export async function upsertChapter(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole(["admin", "teacher", "manager"]);

  const parsed = chapterInputSchema.safeParse({
    id: formData.get("id") || undefined,
    classId: formData.get("classId"),
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }
  const { id, classId, subjectId, title } = parsed.data;

  await assertWriteScope(user, classId, subjectId);

  if (id) {
    await db.update(chapters).set({ title }).where(eq(chapters.id, id));
  } else {
    const [{ next }] = await db
      .select({
        next: sql<number>`coalesce(max(${chapters.position}), -1) + 1`.mapWith(
          Number,
        ),
      })
      .from(chapters)
      .where(
        and(eq(chapters.classId, classId), eq(chapters.subjectId, subjectId)),
      );

    await db.insert(chapters).values({
      classId,
      subjectId,
      title,
      position: next,
      createdBy: user.id,
    });
  }

  revalidatePath("/teacher/content");
  return { success: id ? "Chapitre mis à jour" : "Chapitre créé" };
}

export async function deleteChapter(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [row] = await db
    .select({ classId: chapters.classId, subjectId: chapters.subjectId })
    .from(chapters)
    .where(eq(chapters.id, id))
    .limit(1);
  if (!row) return;
  await assertWriteScope(user, row.classId, row.subjectId);

  await db.delete(chapters).where(eq(chapters.id, id));
  revalidatePath("/teacher/content");
}

export async function moveChapter(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const [self] = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, id))
    .limit(1);
  if (!self) return;
  await assertWriteScope(user, self.classId, self.subjectId);

  const neighbor = await db
    .select()
    .from(chapters)
    .where(
      and(
        eq(chapters.classId, self.classId),
        eq(chapters.subjectId, self.subjectId),
        direction === "up"
          ? lt(chapters.position, self.position)
          : gt(chapters.position, self.position),
      ),
    )
    .orderBy(direction === "up" ? desc(chapters.position) : asc(chapters.position))
    .limit(1);
  if (neighbor.length === 0) return;

  const other = neighbor[0];
  await db.transaction(async (tx) => {
    // Two-step swap to avoid hitting any future unique constraint on position.
    await tx
      .update(chapters)
      .set({ position: -1 })
      .where(eq(chapters.id, self.id));
    await tx
      .update(chapters)
      .set({ position: self.position })
      .where(eq(chapters.id, other.id));
    await tx
      .update(chapters)
      .set({ position: other.position })
      .where(eq(chapters.id, self.id));
  });

  revalidatePath("/teacher/content");
}
