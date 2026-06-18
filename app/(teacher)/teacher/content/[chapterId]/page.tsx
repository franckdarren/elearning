import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  chapters,
  classes,
  subjects,
  sequences,
  resources,
} from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SequenceDialog } from "./sequence-dialog";
import { VideoUploadDialog } from "./video-upload-dialog";
import { DocumentUploadDialog } from "./document-upload-dialog";
import { ResourceRow } from "./resource-row";
import { requireRole } from "@/lib/auth/permissions";
import { assertWriteScope } from "@/lib/auth/scope";
import { deleteSequence } from "@/lib/actions/sequences";

export const metadata = { title: "Enseignant · Chapitre" };
export const dynamic = "force-dynamic";

type Resource = {
  id: string;
  type: "video" | "document";
  title: string;
  status: "draft" | "scheduled" | "published" | "archived";
  sequenceId: string | null;
  publishedAt: Date | null;
  unpublishAt: Date | null;
  position: number;
};

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const user = await requireRole(["admin", "teacher"]);
  const { chapterId } = await params;

  const [chapter] = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      classId: chapters.classId,
      subjectId: chapters.subjectId,
      className: classes.name,
      subjectName: subjects.name,
    })
    .from(chapters)
    .innerJoin(classes, eq(classes.id, chapters.classId))
    .innerJoin(subjects, eq(subjects.id, chapters.subjectId))
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!chapter) notFound();
  await assertWriteScope(user, chapter.classId, chapter.subjectId);

  const [seqRows, resRows] = await Promise.all([
    db
      .select()
      .from(sequences)
      .where(eq(sequences.chapterId, chapterId))
      .orderBy(asc(sequences.position)),
    db
      .select()
      .from(resources)
      .where(eq(resources.chapterId, chapterId))
      .orderBy(asc(resources.position)),
  ]);

  const resourcesBySequence = new Map<string | null, Resource[]>();
  resourcesBySequence.set(null, []);
  for (const s of seqRows) resourcesBySequence.set(s.id, []);
  for (const r of resRows) {
    const key = r.sequenceId ?? null;
    if (!resourcesBySequence.has(key)) resourcesBySequence.set(key, []);
    resourcesBySequence.get(key)!.push(r as Resource);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="text-sm text-zinc-500">
          <Link
            href={`/teacher/content?classId=${chapter.classId}&subjectId=${chapter.subjectId}`}
            className="hover:underline"
          >
            ← {chapter.className} — {chapter.subjectName}
          </Link>
        </div>
        <h1 className="text-2xl font-semibold">{chapter.title}</h1>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 pt-6">
          <VideoUploadDialog chapterId={chapterId} sequences={seqRows} />
          <DocumentUploadDialog chapterId={chapterId} sequences={seqRows} />
          <SequenceDialog
            chapterId={chapterId}
            trigger={<Button variant="outline">Nouvelle séquence</Button>}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Directement dans le chapitre</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(resourcesBySequence.get(null) ?? []).length === 0 ? (
            <p className="px-6 pb-4 text-sm text-zinc-500">
              Aucune ressource hors séquence.
            </p>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {resourcesBySequence
                .get(null)!
                .map((r) => <ResourceRow key={r.id} r={r} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {seqRows.map((s) => (
        <Card key={s.id}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle>{s.title}</CardTitle>
            <div className="flex gap-1">
              <SequenceDialog
                chapterId={chapterId}
                sequence={{ id: s.id, title: s.title }}
                trigger={
                  <Button variant="ghost" size="sm">
                    Renommer
                  </Button>
                }
              />
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" size="sm" className="text-red-600">
                    Supprimer
                  </Button>
                }
                title={`Supprimer la séquence ${s.title} ?`}
                description="Les ressources de cette séquence resteront dans le chapitre (sans séquence)."
                confirmLabel="Supprimer"
                destructive
                action={async (formData: FormData) => {
                  "use server";
                  formData.set("id", s.id);
                  await deleteSequence(formData);
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {(resourcesBySequence.get(s.id) ?? []).length === 0 ? (
              <p className="px-6 pb-4 text-sm text-zinc-500">
                Aucune ressource dans cette séquence.
              </p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {resourcesBySequence
                  .get(s.id)!
                  .map((r) => <ResourceRow key={r.id} r={r} />)}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
