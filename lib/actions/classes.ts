"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { classes, classSubjects } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { classInputSchema } from "@/lib/validations/class";

export type ActionState = { error?: string; success?: string } | null;

export async function upsertClass(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["admin", "manager"]);

  const parsed = classInputSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    level: formData.get("level"),
    description: formData.get("description"),
    academicYearId: formData.get("academicYearId") || undefined,
    subjectIds: formData.getAll("subjectIds").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }
  const { id, name, level, description, academicYearId, subjectIds } =
    parsed.data;

  const targetId = await db.transaction(async (tx) => {
    let classId: string;
    if (id) {
      classId = id;
      await tx
        .update(classes)
        .set({
          name,
          level,
          description: description ?? null,
          academicYearId: academicYearId ?? null,
        })
        .where(eq(classes.id, id));
    } else {
      const [inserted] = await tx
        .insert(classes)
        .values({
          name,
          level,
          description: description ?? null,
          academicYearId: academicYearId ?? null,
        })
        .returning({ id: classes.id });
      classId = inserted.id;
    }

    // Sync class_subjects: drop those not in subjectIds, insert missing ones.
    if (subjectIds.length === 0) {
      await tx
        .delete(classSubjects)
        .where(eq(classSubjects.classId, classId));
    } else {
      await tx
        .delete(classSubjects)
        .where(
          and(
            eq(classSubjects.classId, classId),
            notInArray(classSubjects.subjectId, subjectIds),
          ),
        );

      const existing = await tx
        .select({ subjectId: classSubjects.subjectId })
        .from(classSubjects)
        .where(eq(classSubjects.classId, classId));
      const existingIds = new Set(existing.map((r) => r.subjectId));
      const toInsert = subjectIds
        .filter((s) => !existingIds.has(s))
        .map((subjectId) => ({ classId, subjectId }));
      if (toInsert.length > 0) {
        await tx.insert(classSubjects).values(toInsert);
      }
    }

    return classId;
  });

  revalidatePath("/admin/classes");
  revalidatePath("/manager/classes");
  return { success: id ? "Classe mise à jour" : "Classe créée" };
}

export async function deleteClass(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(classes).where(eq(classes.id, id));
  revalidatePath("/admin/classes");
  revalidatePath("/manager/classes");
}
