import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  classes,
  subjects,
  resources,
  quizzes,
  teacherAssignments,
} from "@/lib/db/schema";
import { and, count, eq, sql } from "drizzle-orm";

export const metadata = { title: "Gestionnaire · Tableau de bord" };
export const dynamic = "force-dynamic";

async function kpis() {
  const [
    [{ value: classCount }],
    [{ value: subjectCount }],
    [{ value: teacherAssigned }],
    [{ value: publishedRes }],
    [{ value: scheduledRes }],
    [{ value: scheduledQuiz }],
  ] = await Promise.all([
    db.select({ value: count() }).from(classes),
    db.select({ value: count() }).from(subjects),
    db
      .select({
        value: sql<number>`count(distinct ${teacherAssignments.teacherId})`.mapWith(
          Number,
        ),
      })
      .from(teacherAssignments),
    db
      .select({ value: count() })
      .from(resources)
      .where(eq(resources.status, "published")),
    db
      .select({ value: count() })
      .from(resources)
      .where(
        and(
          eq(resources.status, "scheduled"),
          sql`${resources.publishedAt} > now()`,
        ),
      ),
    db
      .select({ value: count() })
      .from(quizzes)
      .where(eq(quizzes.status, "scheduled")),
  ]);

  return {
    classCount,
    subjectCount,
    teacherAssigned,
    publishedRes,
    scheduledRes,
    scheduledQuiz,
  };
}

export default async function ManagerDashboardPage() {
  const k = await kpis();

  const cards: Array<[string, number]> = [
    ["Classes", k.classCount],
    ["Matières", k.subjectCount],
    ["Enseignants affectés", k.teacherAssigned],
    ["Contenus publiés", k.publishedRes],
    ["Contenus programmés", k.scheduledRes],
    ["QCM programmés", k.scheduledQuiz],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-zinc-500">Vue de votre périmètre.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-500">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{value}</CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
