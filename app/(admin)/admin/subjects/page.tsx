import { db } from "@/lib/db";
import {
  subjects,
  classSubjects,
  classes,
  establishments,
} from "@/lib/db/schema";
import { asc, eq, sql, desc } from "drizzle-orm";
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
import { SubjectDialog } from "./subject-dialog";
import { SubjectRowActions } from "./subject-row-actions";

export const metadata = { title: "Admin · Matières" };
export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const [rows, establishmentList] = await Promise.all([
    db
      .select({
        id: subjects.id,
        name: subjects.name,
        description: subjects.description,
        establishmentName: establishments.name,
        classCount:
          sql<number>`count(distinct ${classSubjects.classId})`.mapWith(Number),
      })
      .from(subjects)
      .leftJoin(establishments, eq(establishments.id, subjects.establishmentId))
      .leftJoin(classSubjects, eq(classSubjects.subjectId, subjects.id))
      .leftJoin(classes, eq(classes.id, classSubjects.classId))
      .groupBy(subjects.id, establishments.name)
      .orderBy(desc(subjects.createdAt)),
    db
      .select({ id: establishments.id, name: establishments.name })
      .from(establishments)
      .orderBy(asc(establishments.name)),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Matières</h1>
          <p className="text-sm text-zinc-500">
            {rows.length} matière{rows.length > 1 ? "s" : ""}
          </p>
        </div>
        <SubjectDialog
          establishments={establishmentList}
          trigger={<Button>Nouvelle matière</Button>}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">Aucune matière.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-zinc-500">
                      {s.establishmentName ?? "—"}
                    </TableCell>
                    <TableCell className="text-zinc-500">
                      {s.description ?? "—"}
                    </TableCell>
                    <TableCell>{s.classCount}</TableCell>
                    <TableCell className="text-right">
                      <SubjectRowActions subject={s} />
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
