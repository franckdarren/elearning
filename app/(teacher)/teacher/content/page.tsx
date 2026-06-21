import Link from "next/link";
import { db } from "@/lib/db";
import {
  teacherAssignments,
  classes,
  subjects,
  chapters,
  resources,
  sequences,
} from "@/lib/db/schema";
import { and, asc, countDistinct, eq } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/permissions";
import { ScopeSelector } from "./scope-selector";
import { ChapterDialog } from "./chapter-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteChapter, moveChapter } from "@/lib/actions/chapters";

export const metadata = { title: "Enseignant · Contenus" };
export const dynamic = "force-dynamic";

type Search = { classId?: string; subjectId?: string };

export default async function TeacherContentPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireRole(["admin", "teacher"]);
  const sp = await searchParams;

  const assignments = await db
    .select({
      classId: teacherAssignments.classId,
      subjectId: teacherAssignments.subjectId,
      className: classes.name,
      subjectName: subjects.name,
    })
    .from(teacherAssignments)
    .innerJoin(classes, eq(classes.id, teacherAssignments.classId))
    .innerJoin(subjects, eq(subjects.id, teacherAssignments.subjectId))
    .where(eq(teacherAssignments.teacherId, user.id))
    .orderBy(asc(classes.name), asc(subjects.name));

  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Contenus</h1>
        <Card>
          <CardContent className="p-6 text-sm text-zinc-500">
            Aucune affectation pour le moment. Contactez votre administrateur.
          </CardContent>
        </Card>
      </div>
    );
  }

  const chosen = assignments.find(
    (a) => a.classId === sp.classId && a.subjectId === sp.subjectId,
  );
  const active = chosen ?? assignments[0];

  const chaptersRows = await db
    .select({
      id: chapters.id,
      title: chapters.title,
      position: chapters.position,
      // countDistinct évite le produit cartésien des deux LEFT JOIN
      resourceCount: countDistinct(resources.id),
      sequenceCount: countDistinct(sequences.id),
    })
    .from(chapters)
    .leftJoin(resources, eq(resources.chapterId, chapters.id))
    .leftJoin(sequences, eq(sequences.chapterId, chapters.id))
    .where(
      and(
        eq(chapters.classId, active.classId),
        eq(chapters.subjectId, active.subjectId),
      ),
    )
    .groupBy(chapters.id)
    .orderBy(asc(chapters.position));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Contenus</h1>
        <p className="text-sm text-zinc-500">
          Choisissez le périmètre, puis ajoutez des chapitres et des
          ressources.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <ScopeSelector
            assignments={assignments}
            classId={active.classId}
            subjectId={active.subjectId}
          />
          <div className="ml-auto">
            <ChapterDialog
              classId={active.classId}
              subjectId={active.subjectId}
              trigger={<Button>Nouveau chapitre</Button>}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {chaptersRows.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              Aucun chapitre. Créez le premier pour commencer.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {chaptersRows.map((c, idx) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
                >
                  {/* Ligne 1 : numéro + titre + badge */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-right text-xs text-zinc-400">
                      {idx + 1}
                    </span>
                    <Link
                      href={`/teacher/content/${c.id}`}
                      className="min-w-0 flex-1 truncate font-medium hover:underline"
                    >
                      {c.title}
                    </Link>
                    <Badge variant="outline" className="shrink-0">
                      {c.resourceCount} ressource
                      {c.resourceCount > 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {/* Ligne 2 (mobile) / suite (desktop) : actions */}
                  <div className="flex shrink-0 flex-wrap gap-1 sm:ml-auto">
                    <form action={moveChapter}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        disabled={idx === 0}
                      >
                        ↑
                      </Button>
                    </form>
                    <form action={moveChapter}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        disabled={idx === chaptersRows.length - 1}
                      >
                        ↓
                      </Button>
                    </form>
                    <ChapterDialog
                      classId={active.classId}
                      subjectId={active.subjectId}
                      chapter={{ id: c.id, title: c.title }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Modifier
                        </Button>
                      }
                    />
                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                        >
                          Supprimer
                        </Button>
                      }
                      title={`Supprimer ${c.title} ?`}
                      description="Toutes les séquences et ressources rattachées seront supprimées."
                      confirmLabel="Supprimer"
                      destructive
                      successMessage={`Chapitre "${c.title}" supprimé`}
                      action={async (formData: FormData) => {
                        "use server";
                        formData.set("id", c.id);
                        await deleteChapter(formData);
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
