"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters } from "@/lib/db/schema";
import { requireRole } from "@/lib/auth/permissions";
import { assertWriteScope } from "@/lib/auth/scope";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type UploadUrlResult =
  | { ok: true; signedUrl: string; path: string }
  | { ok: false; error: string };

function buildPath(prefix: string, chapterId: string, fileName: string) {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${chapterId}/${Date.now()}-${safe}`;
}

async function checkScope(chapterId: string) {
  const user = await requireRole(["admin", "teacher", "manager"]);
  const [c] = await db
    .select({ classId: chapters.classId, subjectId: chapters.subjectId })
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!c) return { user: null, c: null, error: "Chapitre introuvable" } as const;
  try {
    await assertWriteScope(user, c.classId, c.subjectId);
  } catch {
    return { user: null, c: null, error: "Accès refusé à ce chapitre" } as const;
  }
  return { user, c, error: null } as const;
}

export async function getVideoSignedUploadUrl(
  chapterId: string,
  filename: string,
): Promise<UploadUrlResult> {
  const { error } = await checkScope(chapterId);
  if (error) return { ok: false, error };

  const path = buildPath("videos", chapterId, filename);
  const supabase = createServiceRoleClient();
  const { data, error: supaErr } = await supabase.storage
    .from("videos")
    .createSignedUploadUrl(path);

  if (supaErr || !data) {
    return { ok: false, error: supaErr?.message ?? "Impossible de créer l'URL d'upload" };
  }
  return { ok: true, signedUrl: data.signedUrl, path };
}

export async function getDocumentSignedUploadUrl(
  chapterId: string,
  filename: string,
): Promise<UploadUrlResult> {
  const { error } = await checkScope(chapterId);
  if (error) return { ok: false, error };

  const path = buildPath("documents", chapterId, filename);
  const supabase = createServiceRoleClient();
  const { data, error: supaErr } = await supabase.storage
    .from("documents")
    .createSignedUploadUrl(path);

  if (supaErr || !data) {
    return { ok: false, error: supaErr?.message ?? "Impossible de créer l'URL d'upload" };
  }
  return { ok: true, signedUrl: data.signedUrl, path };
}

export async function getThumbnailSignedUploadUrl(
  chapterId: string,
  filename: string,
): Promise<UploadUrlResult> {
  const { error } = await checkScope(chapterId);
  if (error) return { ok: false, error };

  const path = buildPath("thumbnails", chapterId, filename);
  const supabase = createServiceRoleClient();
  const { data, error: supaErr } = await supabase.storage
    .from("thumbnails")
    .createSignedUploadUrl(path);

  if (supaErr || !data) {
    return { ok: false, error: supaErr?.message ?? "Impossible de créer l'URL d'upload" };
  }
  return { ok: true, signedUrl: data.signedUrl, path };
}
