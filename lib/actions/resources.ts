"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { resources, chapters } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { assertWriteScope } from "@/lib/auth/scope";
import { videoProvider } from "@/lib/storage/video-provider";
import { documentProvider } from "@/lib/storage/document-provider";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import {
  videoResourceSchema,
  documentResourceSchema,
  resourceStatusSchema,
} from "@/lib/validations/resource";

export type ActionState = { error?: string; success?: string } | null;

const THUMB_BUCKET = "thumbnails";
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_DOC_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_THUMB_BYTES = 5 * 1024 * 1024; // 5 MB

async function chapterScope(chapterId: string) {
  const [c] = await db
    .select({ classId: chapters.classId, subjectId: chapters.subjectId })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  return c;
}

async function nextPosition(chapterId: string): Promise<number> {
  const [{ next }] = await db
    .select({
      next: sql<number>`coalesce(max(${resources.position}), -1) + 1`.mapWith(
        Number,
      ),
    })
    .from(resources)
    .where(eq(resources.chapterId, chapterId));
  return next;
}

function buildPath(prefix: string, chapterId: string, fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${chapterId}/${Date.now()}-${safe}`;
}

function nullableTimestamp(v?: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function autoStatus(
  status: "draft" | "scheduled" | "published" | "archived",
  publishedAt: Date | null,
) {
  // Promote 'scheduled' to 'published' if the date is already past.
  if (status === "scheduled" && publishedAt && publishedAt <= new Date()) {
    return "published" as const;
  }
  return status;
}

// ---------------------------------------------------------------------------
// Video
// ---------------------------------------------------------------------------
export async function createVideoResource(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole(["admin", "teacher", "manager"]);

  const rawSeqId = formData.get("sequenceId") as string | null;
  const parsed = videoResourceSchema.safeParse({
    chapterId: formData.get("chapterId"),
    sequenceId: rawSeqId && rawSeqId !== "none" ? rawSeqId : undefined,
    title: formData.get("title"),
    description: formData.get("description"),
    durationSeconds: formData.get("durationSeconds") || undefined,
    author: formData.get("author"),
    status: formData.get("status") ?? "draft",
    publishedAt: formData.get("publishedAt") ?? "",
    unpublishAt: formData.get("unpublishAt") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Veuillez sélectionner un fichier vidéo" };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { error: `Fichier trop volumineux (max ${MAX_VIDEO_BYTES / 1_000_000} MB)` };
  }

  const thumb = formData.get("thumbnail");
  if (thumb instanceof File && thumb.size > MAX_THUMB_BYTES) {
    return { error: "Miniature trop volumineuse (max 5 MB)" };
  }

  const data = parsed.data;
  const c = await chapterScope(data.chapterId);
  if (!c) return { error: "Chapitre introuvable" };

  try {
    await assertWriteScope(user, c.classId, c.subjectId);
  } catch {
    return { error: "Accès refusé à ce chapitre" };
  }

  const videoPath = buildPath("videos", data.chapterId, file.name);

  try {
    await videoProvider.upload(file, videoPath);
  } catch (e) {
    return {
      error: `Échec du stockage vidéo : ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  let thumbnailPath: string | null = null;
  if (thumb instanceof File && thumb.size > 0) {
    const supabase = createServiceRoleClient();
    thumbnailPath = buildPath("thumbnails", data.chapterId, thumb.name);
    const { error } = await supabase.storage
      .from(THUMB_BUCKET)
      .upload(thumbnailPath, thumb, { contentType: thumb.type, upsert: false });
    if (error) return { error: `Miniature : ${error.message}` };
  }

  const publishedAt = nullableTimestamp(data.publishedAt);
  const unpublishAt = nullableTimestamp(data.unpublishAt);
  const status = autoStatus(data.status, publishedAt);

  try {
    await db.insert(resources).values({
      chapterId: data.chapterId,
      sequenceId: data.sequenceId ?? null,
      type: "video",
      title: data.title,
      description: data.description ?? null,
      videoPath,
      thumbnailPath,
      durationSeconds: data.durationSeconds ?? null,
      author: data.author ?? null,
      status,
      publishedAt,
      unpublishAt,
      position: await nextPosition(data.chapterId),
      createdBy: user.id,
    });
  } catch (e) {
    return {
      error: `Erreur base de données : ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  revalidatePath(`/teacher/content/${data.chapterId}`);
  return { success: "Vidéo enregistrée" };
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------
export async function createDocumentResource(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole(["admin", "teacher", "manager"]);

  const rawSeqIdDoc = formData.get("sequenceId") as string | null;
  const parsed = documentResourceSchema.safeParse({
    chapterId: formData.get("chapterId"),
    sequenceId: rawSeqIdDoc && rawSeqIdDoc !== "none" ? rawSeqIdDoc : undefined,
    title: formData.get("title"),
    description: formData.get("description"),
    documentAccess: formData.get("documentAccess") ?? "view_only",
    status: formData.get("status") ?? "draft",
    publishedAt: formData.get("publishedAt") ?? "",
    unpublishAt: formData.get("unpublishAt") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Veuillez sélectionner un fichier" };
  }
  if (file.size > MAX_DOC_BYTES) {
    return { error: `Fichier trop volumineux (max ${MAX_DOC_BYTES / 1_000_000} MB)` };
  }

  const data = parsed.data;
  const c = await chapterScope(data.chapterId);
  if (!c) return { error: "Chapitre introuvable" };

  try {
    await assertWriteScope(user, c.classId, c.subjectId);
  } catch {
    return { error: "Accès refusé à ce chapitre" };
  }

  const documentPath = buildPath("documents", data.chapterId, file.name);

  try {
    await documentProvider.upload(file, documentPath);
  } catch (e) {
    return {
      error: `Échec du stockage document : ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const publishedAt = nullableTimestamp(data.publishedAt);
  const unpublishAt = nullableTimestamp(data.unpublishAt);
  const status = autoStatus(data.status, publishedAt);

  try {
    await db.insert(resources).values({
      chapterId: data.chapterId,
      sequenceId: data.sequenceId ?? null,
      type: "document",
      title: data.title,
      description: data.description ?? null,
      documentPath,
      documentAccess: data.documentAccess,
      status,
      publishedAt,
      unpublishAt,
      position: await nextPosition(data.chapterId),
      createdBy: user.id,
    });
  } catch (e) {
    return {
      error: `Erreur base de données : ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  revalidatePath(`/teacher/content/${data.chapterId}`);
  return { success: "Document enregistré" };
}

// ---------------------------------------------------------------------------
// Status / metadata update (no file)
// ---------------------------------------------------------------------------
export async function updateResourceStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole(["admin", "teacher", "manager"]);

  const parsed = resourceStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    publishedAt: formData.get("publishedAt") ?? "",
    unpublishAt: formData.get("unpublishAt") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  const [row] = await db
    .select({
      chapterId: resources.chapterId,
      classId: chapters.classId,
      subjectId: chapters.subjectId,
    })
    .from(resources)
    .innerJoin(chapters, eq(chapters.id, resources.chapterId))
    .where(eq(resources.id, parsed.data.id))
    .limit(1);
  if (!row) return { error: "Ressource introuvable" };
  await assertWriteScope(user, row.classId, row.subjectId);

  const publishedAt = nullableTimestamp(parsed.data.publishedAt);
  const unpublishAt = nullableTimestamp(parsed.data.unpublishAt);
  const status = autoStatus(parsed.data.status, publishedAt);

  await db
    .update(resources)
    .set({ status, publishedAt, unpublishAt })
    .where(eq(resources.id, parsed.data.id));

  if (status === "published") {
    await logActivity({
      userId: user.id,
      action: "resource.publish",
      metadata: { id: parsed.data.id },
    });
  }

  revalidatePath(`/teacher/content/${row.chapterId}`);
  return { success: "Statut mis à jour" };
}

// ---------------------------------------------------------------------------
// Delete (also removes the file in storage)
// ---------------------------------------------------------------------------
export async function deleteResource(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const [row] = await db
    .select({
      type: resources.type,
      videoPath: resources.videoPath,
      thumbnailPath: resources.thumbnailPath,
      documentPath: resources.documentPath,
      chapterId: resources.chapterId,
      classId: chapters.classId,
      subjectId: chapters.subjectId,
    })
    .from(resources)
    .innerJoin(chapters, eq(chapters.id, resources.chapterId))
    .where(eq(resources.id, id))
    .limit(1);
  if (!row) return;
  await assertWriteScope(user, row.classId, row.subjectId);

  // Best-effort storage cleanup.
  try {
    if (row.videoPath) await videoProvider.delete(row.videoPath);
    if (row.documentPath) await documentProvider.delete(row.documentPath);
    if (row.thumbnailPath) {
      const supabase = createServiceRoleClient();
      await supabase.storage.from(THUMB_BUCKET).remove([row.thumbnailPath]);
    }
  } catch (e) {
    // Don't block the DB deletion if storage cleanup fails; just log.
    console.error("Storage cleanup failed", e);
  }

  await db.delete(resources).where(eq(resources.id, id));
  await logActivity({
    userId: user.id,
    action: "resource.delete",
    metadata: { id, type: row.type },
  });
  revalidatePath(`/teacher/content/${row.chapterId}`);
}

// ---------------------------------------------------------------------------
// Reorder
// ---------------------------------------------------------------------------
export async function moveResource(formData: FormData) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const [self] = await db
    .select()
    .from(resources)
    .where(eq(resources.id, id))
    .limit(1);
  if (!self) return;

  const c = await chapterScope(self.chapterId);
  if (!c) return;
  await assertWriteScope(user, c.classId, c.subjectId);

  const neighbor = await db
    .select()
    .from(resources)
    .where(
      and(
        eq(resources.chapterId, self.chapterId),
        direction === "up"
          ? lt(resources.position, self.position)
          : gt(resources.position, self.position),
      ),
    )
    .orderBy(
      direction === "up" ? desc(resources.position) : asc(resources.position),
    )
    .limit(1);
  if (neighbor.length === 0) return;
  const other = neighbor[0];

  await db.transaction(async (tx) => {
    await tx
      .update(resources)
      .set({ position: -1 })
      .where(eq(resources.id, self.id));
    await tx
      .update(resources)
      .set({ position: self.position })
      .where(eq(resources.id, other.id));
    await tx
      .update(resources)
      .set({ position: other.position })
      .where(eq(resources.id, self.id));
  });

  revalidatePath(`/teacher/content/${self.chapterId}`);
}
