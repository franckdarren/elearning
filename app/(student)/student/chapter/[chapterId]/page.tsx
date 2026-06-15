import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  chapters,
  classes,
  subjects,
  resources,
  sequences,
  studentSubjectAccess,
  progress,
} from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/permissions";
import { isWithinResourceWindow } from "@/lib/auth/student-access";
import { ResourcePlayerDialog } from "@/components/student/resource-player-dialog";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const metadata = { title: "Élève · Chapitre" };
export const dynamic = "force-dynamic";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function thumbnailUrl(path: string | null): string | null {
  if (!path) return null;
  const supabase = createServiceRoleClient();
  const { data } = supabase.storage.from("thumbnails").getPublicUrl(path);
  return data.publicUrl;
}

export default async function StudentChapterPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const user = await requireRole("student");
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
    .innerJoin(
      studentSubjectAccess,
      and(
        eq(studentSubjectAccess.studentId, user.id),
        eq(studentSubjectAccess.classId, chapters.classId),
        eq(studentSubjectAccess.subjectId, chapters.subjectId),
      ),
    )
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!chapter) notFound();

  const [seqRows, resRows, progressRows] = await Promise.all([
    db
      .select()
      .from(sequences)
      .where(eq(sequences.chapterId, chapterId))
      .orderBy(asc(sequences.position)),
    db
      .select({
        id: resources.id,
        type: resources.type,
        title: resources.title,
        description: resources.description,
        sequenceId: resources.sequenceId,
        thumbnailPath: resources.thumbnailPath,
        publishedAt: resources.publishedAt,
        position: resources.position,
      })
      .from(resources)
      .where(
        and(eq(resources.chapterId, chapterId), isWithinResourceWindow()!),
      )
      .orderBy(asc(resources.position)),
    db
      .select({
        resourceId: progress.resourceId,
        watched: progress.watched,
      })
      .from(progress)
      .where(eq(progress.studentId, user.id)),
  ]);

  const watchedSet = new Set(
    progressRows.filter((p) => p.watched && p.resourceId).map((p) => p.resourceId as string),
  );

  type ResRow = (typeof resRows)[number] & { thumbnailUrl: string | null };
  const enriched: ResRow[] = resRows.map((r) => ({
    ...r,
    thumbnailUrl: thumbnailUrl(r.thumbnailPath),
  }));

  const byBucket = new Map<string | null, ResRow[]>([[null, []]]);
  for (const s of seqRows) byBucket.set(s.id, []);
  for (const r of enriched) {
    const key = r.sequenceId ?? null;
    if (!byBucket.has(key)) byBucket.set(key, []);
    byBucket.get(key)!.push(r);
  }

  function ResourceCard({ r }: { r: ResRow }) {
    const isNew =
      r.publishedAt &&
      Date.now() - new Date(r.publishedAt).getTime() < SEVEN_DAYS;
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm">
        <Badge variant="outline" className="w-24 justify-center text-xs">
          {r.type === "video" ? "Vidéo" : "Document"}
        </Badge>
        <div className="flex-1">
          <div className="font-medium">{r.title}</div>
          {r.description ? (
            <div className="text-xs text-zinc-500">{r.description}</div>
          ) : null}
        </div>
        {isNew ? <Badge variant="default">Nouveau</Badge> : null}
        {watchedSet.has(r.id) ? <Badge variant="secondary">Vu</Badge> : null}
        <ResourcePlayerDialog
          resource={{
            id: r.id,
            type: r.type,
            title: r.title,
            description: r.description,
            thumbnailUrl: r.thumbnailUrl,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-zinc-500">
          <Link
            href={`/student/subjects/${chapter.subjectId}`}
            className="hover:underline"
          >
            ← {chapter.subjectName}
          </Link>
        </div>
        <h1 className="text-2xl font-semibold">{chapter.title}</h1>
        <p className="text-sm text-zinc-500">{chapter.className}</p>
      </div>

      {(byBucket.get(null) ?? []).length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {byBucket.get(null)!.map((r) => <ResourceCard key={r.id} r={r} />)}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {seqRows.map((s) => {
        const items = byBucket.get(s.id) ?? [];
        if (items.length === 0) return null;
        return (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((r) => <ResourceCard key={r.id} r={r} />)}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {enriched.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-zinc-500">
            Aucune ressource publiée dans ce chapitre.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
