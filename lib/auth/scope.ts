import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teacherAssignments } from "@/lib/db/schema";
import type { CurrentUser } from "@/lib/auth/permissions";

/**
 * Throws if the current user cannot write on a given (class, subject) pair.
 * - admin / manager pass through
 * - teacher must have a row in teacher_assignments
 */
export async function assertWriteScope(
  user: CurrentUser,
  classId: string,
  subjectId: string,
) {
  if (user.role === "admin" || user.role === "manager") return;
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
