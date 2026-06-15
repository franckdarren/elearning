"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { progress, resources } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { studentReadableResource } from "@/lib/auth/student-access";
import { videoProvider } from "@/lib/storage/video-provider";
import { documentProvider } from "@/lib/storage/document-provider";

const SIGNED_URL_TTL = 60 * 60; // 1h max per CLAUDE.md §6.

export type SignedResource =
  | {
      ok: true;
      type: "video";
      title: string;
      signedUrl: string;
      durationSeconds: number | null;
    }
  | {
      ok: true;
      type: "document";
      title: string;
      signedUrl: string;
      downloadable: boolean;
    }
  | { ok: false; error: string };

export async function getResourceSignedUrl(
  resourceId: string,
): Promise<SignedResource> {
  const user = await requireRole("student");
  const r = await studentReadableResource(user.id, resourceId);
  if (!r) return { ok: false, error: "Ressource indisponible" };

  if (r.type === "video") {
    if (!r.videoPath) return { ok: false, error: "Fichier introuvable" };
    const signedUrl = await videoProvider.getSignedUrl(
      r.videoPath,
      SIGNED_URL_TTL,
    );
    return {
      ok: true,
      type: "video",
      title: r.title,
      signedUrl,
      durationSeconds: r.durationSeconds,
    };
  }

  if (!r.documentPath) return { ok: false, error: "Fichier introuvable" };
  const signedUrl = await documentProvider.getSignedUrl(
    r.documentPath,
    SIGNED_URL_TTL,
  );
  return {
    ok: true,
    type: "document",
    title: r.title,
    signedUrl,
    downloadable: r.documentAccess === "downloadable",
  };
}

export async function markProgress(input: {
  resourceId: string;
  watchedSeconds: number;
  completed?: boolean;
}) {
  const user = await requireRole("student");
  const r = await studentReadableResource(user.id, input.resourceId);
  if (!r) return { ok: false as const };

  const seconds = Math.max(0, Math.floor(input.watchedSeconds));
  const completed = Boolean(input.completed);

  await db
    .insert(progress)
    .values({
      studentId: user.id,
      resourceId: input.resourceId,
      watchedSeconds: seconds,
      watched: completed,
      completedAt: completed ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [progress.studentId, progress.resourceId],
      set: {
        watchedSeconds: seconds,
        watched: completed,
        completedAt: completed ? new Date() : null,
      },
    });
  return { ok: true as const };
}
