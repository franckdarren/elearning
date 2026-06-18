import Link from "next/link";
import { db } from "@/lib/db";
import {
  quizzes,
  classes,
  subjects,
  chapters,
  teacherAssignments,
  questions,
} from "@/lib/db/schema";
import { and, asc, count, eq, inArray, or } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/permissions";
import { QuizDialog } from "./quiz-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteQuiz } from "@/lib/actions/quizzes";

export const metadata = { title: "Enseignant · QCM" };
export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  draft: "Brouillon",
  scheduled: "Programmé",
  published: "Publié",
  archived: "Archivé",
} as const;

export default async function TeacherQuizzesPage() {
  const user = await requireRole(["admin", "teacher"]);

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

  let rows: Array<{
    id: string;
    title: string;
    classId: string;
    subjectId: string;
    chapterId: string | null;
    description: string | null;
    durationMinutes: number | null;
    maxAttempts: number | null;
    opensAt: Date | null;
    closesAt: Date | null;
    status: "draft" | "scheduled" | "published" | "archived";
    className: string;
    subjectName: string;
    questionCount: number;
  }> = [];

  let chaptersList: Array<{
    id: string;
    title: string;
    classId: string;
    subjectId: string;
  }> = [];

  if (assignments.length > 0) {
    const scope = or(
      ...assignments.map(
        (a) =>
          and(
            eq(quizzes.classId, a.classId),
            eq(quizzes.subjectId, a.subjectId),
          )!,
      ),
    );

    rows = await db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        classId: quizzes.classId,
        subjectId: quizzes.subjectId,
        chapterId: quizzes.chapterId,
        description: quizzes.description,
        durationMinutes: quizzes.durationMinutes,
        maxAttempts: quizzes.maxAttempts,
        opensAt: quizzes.opensAt,
        closesAt: quizzes.closesAt,
        status: quizzes.status,
        className: classes.name,
        subjectName: subjects.name,
        questionCount: count(questions.id),
      })
      .from(quizzes)
      .innerJoin(classes, eq(classes.id, quizzes.classId))
      .innerJoin(subjects, eq(subjects.id, quizzes.subjectId))
      .leftJoin(questions, eq(questions.quizId, quizzes.id))
      .where(scope)
      .groupBy(quizzes.id, classes.name, subjects.name)
      .orderBy(asc(quizzes.title));

    const scopeChapter = or(
      ...assignments.map(
        (a) =>
          and(
            eq(chapters.classId, a.classId),
            eq(chapters.subjectId, a.subjectId),
          )!,
      ),
    );
    chaptersList = await db
      .select({
        id: chapters.id,
        title: chapters.title,
        classId: chapters.classId,
        subjectId: chapters.subjectId,
      })
      .from(chapters)
      .where(scopeChapter)
      .orderBy(asc(chapters.title));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">QCM</h1>
          <p className="text-sm text-zinc-500">
            {rows.length} quiz au total
          </p>
        </div>
        <QuizDialog
          assignments={assignments}
          chapters={chaptersList}
          trigger={<Button disabled={assignments.length === 0}>Nouveau quiz</Button>}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              {assignments.length === 0
                ? "Aucune affectation pour le moment."
                : "Aucun quiz."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Périmètre</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link
                        href={`/teacher/quizzes/${q.id}/edit`}
                        className="font-medium hover:underline"
                      >
                        {q.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {q.className} — {q.subjectName}
                    </TableCell>
                    <TableCell>{q.questionCount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={q.status === "published" ? "default" : "outline"}
                      >
                        {STATUS_LABEL[q.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/teacher/quizzes/${q.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            Ouvrir
                          </Button>
                        </Link>
                        <QuizDialog
                          assignments={assignments}
                          chapters={chaptersList}
                          quiz={q}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Paramètres
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
                          title={`Supprimer ${q.title} ?`}
                          description="Les questions, options, tentatives et réponses associées seront supprimées."
                          confirmLabel="Supprimer"
                          destructive
                          successMessage={`QCM "${q.title}" supprimé`}
                          action={async (formData: FormData) => {
                            "use server";
                            formData.set("id", q.id);
                            await deleteQuiz(formData);
                          }}
                        />
                      </div>
                    </TableCell>
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
