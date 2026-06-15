"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { resources, chapters, teacherAssignments } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { videoProvider } from "@/lib/storage/video-provider";
import { documentProvider } from "@/lib/storage/document-provider";

const SIGNED_URL_TTL = 60 * 60; // 1h

export type TeacherSignedResource =
  | { ok: true; type: "video"; title: string; signedUrl: string }
  | { ok: true; type: "document"; title: string; signedUrl: string; downloadable: boolean }
  | { ok: false; error: string };

export async function getTeacherResourceSignedUrl(
  resourceId: string,
): Promise<TeacherSignedResource> {
  const user = await requireRole(["admin", "teacher"]);

  const [r] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!r) return { ok: false, error: "Ressource introuvable" };

  if (user.role === "teacher") {
    const [chapter] = await db
      .select({ classId: chapters.classId, subjectId: chapters.subjectId })
      .from(chapters)
      .where(eq(chapters.id, r.chapterId))
      .limit(1);

    if (!chapter) return { ok: false, error: "Chapitre introuvable" };

    const [assignment] = await db
      .select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.teacherId, user.id),
          eq(teacherAssignments.classId, chapter.classId),
          eq(teacherAssignments.subjectId, chapter.subjectId),
        ),
      )
      .limit(1);

    if (!assignment) return { ok: false, error: "Accès refusé" };
  }

  if (r.type === "video") {
    if (!r.videoPath) return { ok: false, error: "Fichier vidéo introuvable" };
    const signedUrl = await videoProvider.getSignedUrl(r.videoPath, SIGNED_URL_TTL);
    return { ok: true, type: "video", title: r.title, signedUrl };
  }

  if (!r.documentPath) return { ok: false, error: "Fichier document introuvable" };
  const signedUrl = await documentProvider.getSignedUrl(r.documentPath, SIGNED_URL_TTL);
  return {
    ok: true,
    type: "document",
    title: r.title,
    signedUrl,
    downloadable: r.documentAccess === "downloadable",
  };
}
