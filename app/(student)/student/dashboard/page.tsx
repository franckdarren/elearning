import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { studentSubjectAccess, subjects, classes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/permissions";

export const metadata = { title: "Élève · Tableau de bord" };

export default async function StudentDashboardPage() {
  const user = await requireRole("student");

  const myAccess = await db
    .select({
      subjectId: studentSubjectAccess.subjectId,
      subjectName: subjects.name,
      className: classes.name,
    })
    .from(studentSubjectAccess)
    .innerJoin(subjects, eq(subjects.id, studentSubjectAccess.subjectId))
    .innerJoin(classes, eq(classes.id, studentSubjectAccess.classId))
    .where(eq(studentSubjectAccess.studentId, user.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Bonjour {user.fullName || user.email}
        </h1>
        <p className="text-sm text-zinc-500">
          {myAccess.length} matière{myAccess.length > 1 ? "s" : ""} autorisée
          {myAccess.length > 1 ? "s" : ""}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes matières</CardTitle>
        </CardHeader>
        <CardContent>
          {myAccess.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune matière autorisée pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              {myAccess.map((a) => (
                <li key={a.subjectId} className="flex justify-between py-2">
                  <span>{a.subjectName}</span>
                  <span className="text-zinc-500">{a.className}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
