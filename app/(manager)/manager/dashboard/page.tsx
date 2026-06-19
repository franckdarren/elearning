import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  classes,
  subjects,
  resources,
  chapters,
  quizzes,
  teacherAssignments,
  establishments,
} from "@/lib/db/schema";
import { and, count, eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth/permissions";

export const metadata = { title: "Gestionnaire · Tableau de bord" };
export const dynamic = "force-dynamic";

async function kpis(est: string) {
  const [
    [{ value: classCount }],
    [{ value: subjectCount }],
    [{ value: teacherAssigned }],
    [{ value: publishedRes }],
    [{ value: scheduledRes }],
    [{ value: scheduledQuiz }],
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(classes)
      .where(eq(classes.establishmentId, est)),
    db
      .select({ value: count() })
      .from(subjects)
      .where(eq(subjects.establishmentId, est)),
    db
      .select({
        value: sql<number>`count(distinct ${teacherAssignments.teacherId})`.mapWith(
          Number,
        ),
      })
      .from(teacherAssignments)
      .innerJoin(classes, eq(classes.id, teacherAssignments.classId))
      .where(eq(classes.establishmentId, est)),
    db
      .select({ value: count() })
      .from(resources)
      .innerJoin(chapters, eq(chapters.id, resources.chapterId))
      .innerJoin(classes, eq(classes.id, chapters.classId))
      .where(
        and(eq(resources.status, "published"), eq(classes.establishmentId, est)),
      ),
    db
      .select({ value: count() })
      .from(resources)
      .innerJoin(chapters, eq(chapters.id, resources.chapterId))
      .innerJoin(classes, eq(classes.id, chapters.classId))
      .where(
        and(
          eq(resources.status, "scheduled"),
          sql`${resources.publishedAt} > now()`,
          eq(classes.establishmentId, est),
        ),
      ),
    db
      .select({ value: count() })
      .from(quizzes)
      .innerJoin(classes, eq(classes.id, quizzes.classId))
      .where(
        and(eq(quizzes.status, "scheduled"), eq(classes.establishmentId, est)),
      ),
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
  const user = await requireRole("manager");

  // Un gestionnaire sans établissement attribué : message explicite.
  if (!user.establishmentId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-zinc-500">
            Aucun établissement ne vous est attribué pour le moment. Contactez un
            administrateur pour qu&apos;il vous rattache à un établissement.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [k, [establishment]] = await Promise.all([
    kpis(user.establishmentId),
    db
      .select({ name: establishments.name })
      .from(establishments)
      .where(eq(establishments.id, user.establishmentId))
      .limit(1),
  ]);

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
        <p className="text-sm text-zinc-500">
          {establishment?.name
            ? `Établissement : ${establishment.name}`
            : "Vue de votre périmètre."}
        </p>
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
