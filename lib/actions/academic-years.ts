"use server";

import { revalidatePath } from "next/cache";
import { eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { academicYears } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { academicYearSchema } from "@/lib/validations/academic-year";

export type ActionState = { error?: string; success?: string } | null;

export async function upsertAcademicYear(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["admin", "manager"]);

  const parsed = academicYearSchema.safeParse({
    id: formData.get("id") || undefined,
    label: formData.get("label"),
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
    isCurrent: formData.get("isCurrent") === "true",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const { id, label, startDate, endDate, isCurrent } = parsed.data;

  await db.transaction(async (tx) => {
    if (isCurrent) {
      const targetId = id ?? null;
      if (targetId) {
        await tx
          .update(academicYears)
          .set({ isCurrent: false })
          .where(ne(academicYears.id, targetId));
      } else {
        await tx.update(academicYears).set({ isCurrent: false });
      }
    }

    if (id) {
      await tx
        .update(academicYears)
        .set({
          label,
          startDate: startDate ?? null,
          endDate: endDate ?? null,
          isCurrent: !!isCurrent,
        })
        .where(eq(academicYears.id, id));
    } else {
      await tx.insert(academicYears).values({
        label,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        isCurrent: !!isCurrent,
      });
    }
  });

  revalidatePath("/admin/settings");
  revalidatePath("/manager/settings");
  return { success: id ? "Année mise à jour" : "Année créée" };
}

export async function deleteAcademicYear(formData: FormData) {
  await requireRole("admin");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(academicYears).where(eq(academicYears.id, id));
  revalidatePath("/admin/settings");
}
