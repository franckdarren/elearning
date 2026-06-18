import { db } from "@/lib/db";
import {
  classes,
  subjects,
  academicYears,
  classSubjects,
} from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
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
import { ClassDialog } from "@/app/(admin)/admin/classes/class-dialog";

export const metadata = { title: "Gestionnaire · Classes" };
export const dynamic = "force-dynamic";

export default async function ManagerClassesPage() {
  const [rows, allSubjects, allYears] = await Promise.all([
    db
      .select({
        id: classes.id,
        name: classes.name,
        level: classes.level,
        description: classes.description,
        academicYearId: classes.academicYearId,
        yearLabel: academicYears.label,
        subjectIds: sql<
          string[]
        >`coalesce(array_agg(${classSubjects.subjectId}) filter (where ${classSubjects.subjectId} is not null), '{}')`,
        subjectCount: sql<number>`count(${classSubjects.subjectId})`.mapWith(
          Number,
        ),
      })
      .from(classes)
      .leftJoin(academicYears, eq(academicYears.id, classes.academicYearId))
      .leftJoin(classSubjects, eq(classSubjects.classId, classes.id))
      .groupBy(classes.id, academicYears.label)
      .orderBy(desc(classes.createdAt)),
    db
      .select({ id: subjects.id, name: subjects.name })
      .from(subjects)
      .orderBy(subjects.name),
    db
      .select({ id: academicYears.id, label: academicYears.label })
      .from(academicYears)
      .orderBy(desc(academicYears.createdAt)),
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
                    <TableCell>{c.level}</TableCell>
                    <TableCell>
                      {c.yearLabel ?? <span className="text-zinc-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.subjectCount}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ClassDialog
                        cls={{
                          id: c.id,
                          name: c.name,
                          level: c.level,
                          description: c.description,
                          academicYearId: c.academicYearId,
                          subjectIds: c.subjectIds ?? [],
                        }}
                        subjects={allSubjects}
                        years={allYears}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Modifier
                          </Button>
                        }
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
