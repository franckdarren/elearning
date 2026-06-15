import { db } from "@/lib/db";
import {
  teacherAssignments,
  classes,
  subjects,
  chapters,
  resources,
  studentSubjectAccess,
  profiles,
  progress,
} from "@/lib/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/permissions";
import { ScopeSelector } from "../content/scope-selector";

export const metadata = { title: "Enseignant · Progression" };
export const dynamic = "force-dynamic";

type Search = { classId?: string; subjectId?: string };

export default async function TeacherProgressPage({
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
        <h1 className="text-2xl font-semibold">Progression</h1>
        <Card>
          <CardContent className="p-6 text-sm text-zinc-500">
            Aucune affectation pour le moment.
          </CardContent>
        </Card>
      </div>
    );
  }

  const chosen = assignments.find(
    (a) => a.classId === sp.classId && a.subjectId === sp.subjectId,
  );
  const active = chosen ?? assignments[0];

  const chapterRows = await db
    .select({ id: chapters.id })
    .from(chapters)
    .where(
      and(
        eq(chapters.classId, active.classId),
        eq(chapters.subjectId, active.subjectId),
      ),
    );

  const chapterIds = chapterRows.map((c) => c.id);

  const resourceRows =
    chapterIds.length > 0
      ? await db
          .select({
            id: resources.id,
            title: resources.title,
            type: resources.type,
          })
          .from(resources)
          .where(inArray(resources.chapterId, chapterIds))
          .orderBy(asc(resources.position))
      : [];

  const studentRows = await db
    .select({
      id: profiles.id,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
    })
    .from(studentSubjectAccess)
    .innerJoin(profiles, eq(profiles.id, studentSubjectAccess.studentId))
    .where(
      and(
        eq(studentSubjectAccess.classId, active.classId),
        eq(studentSubjectAccess.subjectId, active.subjectId),
      ),
    )
    .orderBy(asc(profiles.lastName), asc(profiles.firstName));

  const progressMap = new Map<string, { watched: boolean; watchedSeconds: number }>();

  if (studentRows.length > 0 && resourceRows.length > 0) {
    const progressRows = await db
      .select({
        studentId: progress.studentId,
        resourceId: progress.resourceId,
        watched: progress.watched,
        watchedSeconds: progress.watchedSeconds,
      })
      .from(progress)
      .where(
        and(
          inArray(
            progress.studentId,
            studentRows.map((s) => s.id),
          ),
          inArray(
            progress.resourceId,
            resourceRows.map((r) => r.id),
          ),
        ),
      );

    for (const p of progressRows) {
      if (p.studentId && p.resourceId) {
        progressMap.set(`${p.studentId}:${p.resourceId}`, {
          watched: p.watched ?? false,
          watchedSeconds: p.watchedSeconds ?? 0,
        });
      }
    }
  }

  const resourceStats = resourceRows.map((r) => {
    const total = studentRows.length;
    const seen = studentRows.filter((s) => {
      const p = progressMap.get(`${s.id}:${r.id}`);
      return p && (p.watched || p.watchedSeconds > 0);
    }).length;
    const completed = studentRows.filter((s) => {
      const p = progressMap.get(`${s.id}:${r.id}`);
      return p?.watched === true;
    }).length;
    return { ...r, total, seen, completed };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Progression</h1>
        <p className="text-sm text-zinc-500">
          Suivi de la consultation des ressources par les élèves.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <ScopeSelector
            assignments={assignments}
            classId={active.classId}
            subjectId={active.subjectId}
          />
        </CardContent>
      </Card>

      {resourceRows.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-zinc-500">
            Aucune ressource dans ce périmètre.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Statistiques par ressource</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ressource</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Consultée</TableHead>
                    <TableHead>Terminée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resourceStats.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {r.type === "video" ? "Vidéo" : "Document"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.seen}/{r.total} élève{r.total > 1 ? "s" : ""}
                        {r.total > 0
                          ? ` (${Math.round((r.seen / r.total) * 100)} %)`
                          : ""}
                      </TableCell>
                      <TableCell>
                        {r.completed}/{r.total}
                        {r.total > 0
                          ? ` (${Math.round((r.completed / r.total) * 100)} %)`
                          : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {studentRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Détail par élève</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Élève</TableHead>
                      {resourceRows.map((r) => (
                        <TableHead
                          key={r.id}
                          className="max-w-[120px] truncate text-xs"
                          title={r.title}
                        >
                          {r.title.length > 20
                            ? r.title.slice(0, 20) + "…"
                            : r.title}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentRows.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.firstName} {s.lastName}
                        </TableCell>
                        {resourceRows.map((r) => {
                          const p = progressMap.get(`${s.id}:${r.id}`);
                          return (
                            <TableCell key={r.id} className="text-center">
                              {p?.watched ? (
                                <span
                                  className="text-emerald-600"
                                  title="Terminé"
                                >
                                  ✓
                                </span>
                              ) : p && p.watchedSeconds > 0 ? (
                                <span
                                  className="text-amber-500"
                                  title="En cours"
                                >
                                  ~
                                </span>
                              ) : (
                                <span
                                  className="text-zinc-300"
                                  title="Non consulté"
                                >
                                  —
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
