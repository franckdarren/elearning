import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  resources,
  chapters,
  studentSubjectAccess,
  quizzes,
} from "@/lib/db/schema";

/**
 * True when a published resource is currently inside its publish window.
 */
export function isWithinResourceWindow() {
  return and(
    eq(resources.status, "published"),
    // published_at NULL = publié immédiatement (le statut "published" fait foi) ;
    // sinon la date programmée doit être passée.
    or(isNull(resources.publishedAt), lte(resources.publishedAt, sql`now()`)),
    or(isNull(resources.unpublishAt), gt(resources.unpublishAt, sql`now()`)),
  );
}

/**
 * True when a quiz is currently published and open.
 */
export function isQuizOpen() {
  return and(
    eq(quizzes.status, "published"),
    or(isNull(quizzes.opensAt), lte(quizzes.opensAt, sql`now()`)),
    or(isNull(quizzes.closesAt), gt(quizzes.closesAt, sql`now()`)),
  );
}

/**
 * Returns the resource if the student is allowed to consume it, otherwise null.
 * Conditions:
 *   - resource is published in window
 *   - student has access on its (class, subject) pair
 */
export async function studentReadableResource(
  studentId: string,
  resourceId: string,
) {
  const [row] = await db
    .select({
      id: resources.id,
      type: resources.type,
      title: resources.title,
      videoPath: resources.videoPath,
      thumbnailPath: resources.thumbnailPath,
      documentPath: resources.documentPath,
      documentAccess: resources.documentAccess,
      durationSeconds: resources.durationSeconds,
      chapterId: resources.chapterId,
    })
    .from(resources)
    .innerJoin(chapters, eq(chapters.id, resources.chapterId))
    .innerJoin(
      studentSubjectAccess,
      and(
        eq(studentSubjectAccess.classId, chapters.classId),
        eq(studentSubjectAccess.subjectId, chapters.subjectId),
        eq(studentSubjectAccess.studentId, studentId),
      ),
    )
    .where(and(eq(resources.id, resourceId), isWithinResourceWindow()!))
    .limit(1);
  return row ?? null;
}

/**
 * Returns the quiz if the student can attempt it now.
 */
export async function studentPlayableQuiz(studentId: string, quizId: string) {
  const [row] = await db
    .select({
      id: quizzes.id,
      title: quizzes.title,
      description: quizzes.description,
      durationMinutes: quizzes.durationMinutes,
      maxAttempts: quizzes.maxAttempts,
      classId: quizzes.classId,
      subjectId: quizzes.subjectId,
      opensAt: quizzes.opensAt,
      closesAt: quizzes.closesAt,
    })
    .from(quizzes)
    .innerJoin(
      studentSubjectAccess,
      and(
        eq(studentSubjectAccess.classId, quizzes.classId),
        eq(studentSubjectAccess.subjectId, quizzes.subjectId),
        eq(studentSubjectAccess.studentId, studentId),
      ),
    )
    .where(and(eq(quizzes.id, quizId), isQuizOpen()!))
    .limit(1);
  return row ?? null;
}
