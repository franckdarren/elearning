"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  teacherAssignments,
  studentEnrollments,
  studentSubjectAccess,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import {
  teacherAssignmentSchema,
  studentScopeSchema,
} from "@/lib/validations/assignment";

export type ActionState = { error?: string; success?: string } | null;

export async function createTeacherAssignment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["admin", "manager"]);

  const parsed = teacherAssignmentSchema.safeParse({
    teacherId: formData.get("teacherId"),
    classId: formData.get("classId"),
    subjectId: formData.get("subjectId"),
  });
  if (!parsed.success) {
    return { error: "Sélectionnez un enseignant, une classe et une matière" };
  }

  await db
    .insert(teacherAssignments)
    .values(parsed.data)
    .onConflictDoNothing();

  revalidatePath("/admin/assignments");
  return { success: "Affectation créée" };
}

export async function deleteTeacherAssignment(formData: FormData) {
  await requireRole(["admin", "manager"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await db.delete(teacherAssignments).where(eq(teacherAssignments.id, id));
  revalidatePath("/admin/assignments");
}

/**
 * Replaces a student's scope:
 *   - sets the unique enrollment to classId (or removes it if none)
 *   - replaces subject access to the picked subjects within that class
 *
 * If classId is empty, the student is unenrolled and loses all access.
 */
export async function setStudentScope(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["admin", "manager"]);

  const parsed = studentScopeSchema.safeParse({
    studentId: formData.get("studentId"),
    classId: formData.get("classId") || undefined,
    subjectIds: formData.getAll("subjectIds").map(String).filter(Boolean),
  });
  if (!parsed.success) {
    return { error: "Données invalides" };
  }
  const { studentId, classId, subjectIds } = parsed.data;

  await db.transaction(async (tx) => {
    await tx
      .delete(studentSubjectAccess)
      .where(eq(studentSubjectAccess.studentId, studentId));
    await tx
      .delete(studentEnrollments)
      .where(eq(studentEnrollments.studentId, studentId));

    if (!classId) return;

    await tx
      .insert(studentEnrollments)
      .values({ studentId, classId })
      .onConflictDoNothing();

    if (subjectIds.length > 0) {
      await tx.insert(studentSubjectAccess).values(
        subjectIds.map((subjectId) => ({
          studentId,
          classId,
          subjectId,
        })),
      );
    }
  });

  revalidatePath("/admin/assignments");
  return { success: "Périmètre élève mis à jour" };
}
