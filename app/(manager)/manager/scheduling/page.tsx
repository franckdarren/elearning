import { db } from "@/lib/db";
import {
  resources,
  chapters,
  classes,
  subjects,
  quizzes,
} from "@/lib/db/schema";
import { and, asc, eq, sql } from "drizzle-orm";
import { requireEstablishment } from "@/lib/auth/permissions";
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
import { StatusDialog } from "@/app/(teacher)/teacher/content/[chapterId]/status-dialog";

export const metadata = { title: "Gestionnaire · Programmation" };
export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  draft: "Brouillon",
  scheduled: "Programmé",
  published: "Publié",
  archived: "Archivé",
} as const;

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("fr-FR");
}

export default async function ManagerSchedulingPage() {
  const user = await requireEstablishment();
  const est = user.establishmentId;

  const [scheduledResources, scheduledQuizzes] = await Promise.all([
    db
      .select({
        id: resources.id,
        title: resources.title,
        type: resources.type,
        status: resources.status,
        publishedAt: resources.publishedAt,
        unpublishAt: resources.unpublishAt,
        chapterTitle: chapters.title,
        className: classes.name,
        subjectName: subjects.name,
      })
      .from(resources)
      .innerJoin(chapters, eq(chapters.id, resources.chapterId))
      .innerJoin(classes, eq(classes.id, chapters.classId))
      .innerJoin(subjects, eq(subjects.id, chapters.subjectId))
      .where(
        and(
          eq(resources.status, "scheduled"),
          sql`${resources.publishedAt} > now()`,
          eq(classes.establishmentId, est),
        ),
      )
      .orderBy(asc(resources.publishedAt)),
    db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        status: quizzes.status,
        opensAt: quizzes.opensAt,
        closesAt: quizzes.closesAt,
        className: classes.name,
        subjectName: subjects.name,
      })
      .from(quizzes)
      .innerJoin(classes, eq(classes.id, quizzes.classId))
      .innerJoin(subjects, eq(subjects.id, quizzes.subjectId))
      .where(
        and(eq(quizzes.status, "scheduled"), eq(classes.establishmentId, est)),
      )
      .orderBy(asc(quizzes.opensAt)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Programmation</h1>
        <p className="text-sm text-zinc-500">
          Contenus dont la publication est planifiée.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ressources programmées</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scheduledResources.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              Aucune ressource programmée.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Chapitre</TableHead>
                  <TableHead>Périmètre</TableHead>
                  <TableHead>Publication</TableHead>
                  <TableHead>Retrait</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledResources.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {r.type === "video" ? "Vidéo" : "Document"}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.chapterTitle}</TableCell>
                    <TableCell className="text-zinc-500">
                      {r.className} — {r.subjectName}
                    </TableCell>
                    <TableCell>{formatDate(r.publishedAt)}</TableCell>
                    <TableCell>{formatDate(r.unpublishAt)}</TableCell>
                    <TableCell className="text-right">
                      <StatusDialog
                        resource={{
                          id: r.id,
                          title: r.title,
                          status: r.status,
                          publishedAt: r.publishedAt,
                          unpublishAt: r.unpublishAt,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QCM programmés</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {scheduledQuizzes.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">Aucun QCM programmé.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Périmètre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Ouverture</TableHead>
                  <TableHead>Fermeture</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledQuizzes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell className="text-zinc-500">
                      {q.className} — {q.subjectName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{STATUS_LABEL[q.status]}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(q.opensAt)}</TableCell>
                    <TableCell>{formatDate(q.closesAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
