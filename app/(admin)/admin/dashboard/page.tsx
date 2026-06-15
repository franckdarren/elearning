import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import {
  profiles,
  classes,
  subjects,
  resources,
  quizzes,
} from "@/lib/db/schema";
import { count, eq, and, sql } from "drizzle-orm";

export const metadata = { title: "Admin · Tableau de bord" };
export const dynamic = "force-dynamic";

async function kpis() {
  const [
    [{ value: students }],
    [{ value: teachers }],
    [{ value: managers }],
    [{ value: classCount }],
    [{ value: subjectCount }],
    [{ value: videoCount }],
    [{ value: quizCount }],
    [{ value: scheduledCount }],
  ] = await Promise.all([
    db
      .select({ value: count() })
      .from(profiles)
      .where(eq(profiles.role, "student")),
    db
      .select({ value: count() })
      .from(profiles)
      .where(eq(profiles.role, "teacher")),
    db
      .select({ value: count() })
      .from(profiles)
      .where(eq(profiles.role, "manager")),
    db.select({ value: count() }).from(classes),
    db.select({ value: count() }).from(subjects),
    db
      .select({ value: count() })
      .from(resources)
      .where(eq(resources.type, "video")),
    db.select({ value: count() }).from(quizzes),
    db
      .select({ value: count() })
      .from(resources)
      .where(
        and(
          eq(resources.status, "scheduled"),
          sql`${resources.publishedAt} > now()`,
        ),
      ),
  ]);

  return {
    students,
    teachers,
    managers,
    classCount,
    subjectCount,
    videoCount,
    quizCount,
    scheduledCount,
  };
}

export default async function AdminDashboardPage() {
  const k = await kpis();

  const cards: Array<[string, number]> = [
    ["Élèves", k.students],
    ["Enseignants", k.teachers],
    ["Gestionnaires", k.managers],
    ["Classes", k.classCount],
    ["Matières", k.subjectCount],
    ["Vidéos", k.videoCount],
    ["QCM", k.quizCount],
    ["Contenus programmés", k.scheduledCount],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tableau de bord</h1>
        <p className="text-sm text-zinc-500">
          Vue d&apos;ensemble de la plateforme.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
