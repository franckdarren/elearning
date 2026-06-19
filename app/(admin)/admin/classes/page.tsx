import { db } from "@/lib/db";
import {
  classes,
  subjects,
  academicYears,
  classSubjects,
  establishments,
} from "@/lib/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";
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
import { ClassDialog } from "./class-dialog";
import { ClassRowActions } from "./class-row-actions";

export const metadata = { title: "Admin · Classes" };
export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const [rows, allSubjects, allYears, establishmentList] = await Promise.all([
    db
      .select({
        id: classes.id,
        name: classes.name,
        level: classes.level,
        description: classes.description,
        academicYearId: classes.academicYearId,
        establishmentId: classes.establishmentId,
        establishmentName: establishments.name,
        yearLabel: academicYears.label,
        subjectIds: sql<
          string[]
        >`coalesce(array_agg(${classSubjects.subjectId}) filter (where ${classSubjects.subjectId} is not null), '{}')`,
        subjectCount: sql<number>`count(${classSubjects.subjectId})`.mapWith(
          Number,
        ),
      })
      .from(classes)
      .leftJoin(establishments, eq(establishments.id, classes.establishmentId))
      .leftJoin(academicYears, eq(academicYears.id, classes.academicYearId))
      .leftJoin(classSubjects, eq(classSubjects.classId, classes.id))
      .groupBy(classes.id, academicYears.label, establishments.name)
      .orderBy(desc(classes.createdAt)),
    db
      .select({
        id: subjects.id,
        name: subjects.name,
        establishmentId: subjects.establishmentId,
      })
      .from(subjects)
      .orderBy(subjects.name),
    db
      .select({ id: academicYears.id, label: academicYears.label })
      .from(academicYears)
      .orderBy(desc(academicYears.createdAt)),
    db
      .select({ id: establishments.id, name: establishments.name })
      .from(establishments)
      .orderBy(asc(establishments.name)),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Classes</h1>
          <p className="text-sm text-zinc-500">
            {rows.length} classe{rows.length > 1 ? "s" : ""}
          </p>
        </div>
        <ClassDialog
          subjects={allSubjects}
          years={allYears}
          establishments={establishmentList}
          trigger={<Button>Nouvelle classe</Button>}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">Aucune classe.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Établissement</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Année</TableHead>
                  <TableHead>Matières</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-zinc-500">
                      {c.establishmentName ?? "—"}
                    </TableCell>
                    <TableCell>{c.level}</TableCell>
                    <TableCell>
                      {c.yearLabel ?? (
                        <span className="text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.subjectCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ClassRowActions
                        cls={{
                          id: c.id,
                          name: c.name,
                          level: c.level,
                          description: c.description,
                          academicYearId: c.academicYearId,
                          establishmentId: c.establishmentId,
                          subjectIds: c.subjectIds ?? [],
                        }}
                        subjects={allSubjects}
                        years={allYears}
                      />
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
