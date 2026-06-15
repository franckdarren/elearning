import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { teacherAssignments, classes, subjects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth/permissions";

export const metadata = { title: "Enseignant · Tableau de bord" };

export default async function TeacherDashboardPage() {
  const user = await requireRole(["admin", "teacher"]);

  const myAssignments = await db
    .select({
      classId: teacherAssignments.classId,
      subjectId: teacherAssignments.subjectId,
      className: classes.name,
      subjectName: subjects.name,
    })
    .from(teacherAssignments)
    .innerJoin(classes, eq(classes.id, teacherAssignments.classId))
    .innerJoin(subjects, eq(subjects.id, teacherAssignments.subjectId))
    .where(eq(teacherAssignments.teacherId, user.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Bonjour {user.fullName || user.email}
        </h1>
        <p className="text-sm text-zinc-500">
          {myAssignments.length} affectation
          {myAssignments.length > 1 ? "s" : ""}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mes classes et matières</CardTitle>
        </CardHeader>
        <CardContent>
          {myAssignments.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune affectation pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              {myAssignments.map((a) => (
                <li
                  key={`${a.classId}-${a.subjectId}`}
                  className="flex justify-between py-2"
                >
                  <span>{a.className}</span>
                  <span className="text-zinc-500">{a.subjectName}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
