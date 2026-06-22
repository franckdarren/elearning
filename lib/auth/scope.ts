import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { classes, teacherAssignments } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/auth/permissions";

/**
 * Throws if the current user cannot write on a given (class, subject) pair.
 * - admin passes through (scope global)
 * - manager : la classe doit appartenir à SON établissement
 * - teacher : doit avoir une ligne dans teacher_assignments
 */
export async function assertWriteScope(
  user: CurrentUser,
  classId: string,
  subjectId: string,
) {
  if (user.role === "admin") return;

  if (user.role === "manager") {
    if (!user.establishmentId) throw new Error("Forbidden");
    const [hit] = await db
      .select({ id: classes.id })
      .from(classes)
      .where(
        and(
          eq(classes.id, classId),
          eq(classes.establishmentId, user.establishmentId),
        ),
      )
      .limit(1);
    if (!hit) throw new Error("Forbidden");
    return;
  }

  if (user.role !== "teacher") throw new Error("Forbidden");

  const [hit] = await db
    .select({ id: teacherAssignments.id })
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.teacherId, user.id),
        eq(teacherAssignments.classId, classId),
        eq(teacherAssignments.subjectId, subjectId),
      ),
    )
    .limit(1);
  if (!hit) throw new Error("Forbidden");
}
