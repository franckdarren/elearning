import Link from "next/link";
import { db } from "@/lib/db";
import {
  quizAttempts,
  quizzes,
  subjects,
  classes,
} from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/permissions";

export const metadata = { title: "Élève · Mes résultats" };
export const dynamic = "force-dynamic";

function pct(score: number | null, max: number | null) {
  if (score == null || max == null || max === 0) return "—";
  return `${Math.round((score / max) * 100)} %`;
}

export default async function StudentResultsPage() {
  const user = await requireRole("student");

  const rows = await db
    .select({
      id: quizAttempts.id,
      quizId: quizAttempts.quizId,
      score: quizAttempts.score,
      maxScore: quizAttempts.maxScore,
      submittedAt: quizAttempts.submittedAt,
      quizTitle: quizzes.title,
      subjectName: subjects.name,
      className: classes.name,
    })
    .from(quizAttempts)
    .innerJoin(quizzes, eq(quizzes.id, quizAttempts.quizId))
    .innerJoin(subjects, eq(subjects.id, quizzes.subjectId))
    .innerJoin(classes, eq(classes.id, quizzes.classId))
    .where(eq(quizAttempts.studentId, user.id))
    .orderBy(desc(quizAttempts.submittedAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mes résultats</h1>
        <p className="text-sm text-zinc-500">
          {rows.length} tentative{rows.length > 1 ? "s" : ""}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              Aucun quiz passé pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Matière</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.quizTitle}</TableCell>
                    <TableCell className="text-zinc-500">
                      {r.subjectName} — {r.className}
                    </TableCell>
                    <TableCell>
                      {pct(
                        r.score == null ? null : Number(r.score),
                        r.maxScore == null ? null : Number(r.maxScore),
                      )}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {r.submittedAt
                        ? new Date(r.submittedAt).toLocaleString("fr-FR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/student/results/${r.id}`}>
                        <Button variant="ghost" size="sm">
                          Détail
                        </Button>
                      </Link>
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
