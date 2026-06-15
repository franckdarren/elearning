"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { subjectInputSchema } from "@/lib/validations/subject";

export type ActionState = { error?: string; success?: string } | null;

export async function upsertSubject(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["admin", "manager"]);

  const parsed = subjectInputSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const { id, name, description } = parsed.data;
  if (id) {
    await db
      .update(subjects)
      .set({ name, description: description ?? null })
      .where(eq(subjects.id, id));
  } else {
    await db.insert(subjects).values({ name, description: description ?? null });
  }

  revalidatePath("/admin/subjects");
  revalidatePath("/manager/subjects");
  return { success: id ? "Matière mise à jour" : "Matière créée" };
}

export async function deleteSubject(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(subjects).where(eq(subjects.id, id));
  revalidatePath("/admin/subjects");
  revalidatePath("/manager/subjects");
}
