import { db } from "@/lib/db";
import { subjects, classSubjects, classes } from "@/lib/db/schema";
import { eq, sql, desc } from "drizzle-orm";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteSubject } from "@/lib/actions/subjects";

export const metadata = { title: "Admin · Matières" };
export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const rows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      description: subjects.description,
      classCount: sql<number>`count(distinct ${classSubjects.classId})`.mapWith(
        Number,
      ),
    })
    .from(subjects)
    .leftJoin(classSubjects, eq(classSubjects.subjectId, subjects.id))
    .leftJoin(classes, eq(classes.id, classSubjects.classId))
    .groupBy(subjects.id)
    .orderBy(desc(subjects.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Matières</h1>
          <p className="text-sm text-zinc-500">
            {rows.length} matière{rows.length > 1 ? "s" : ""}
          </p>
        </div>
        <SubjectDialog trigger={<Button>Nouvelle matière</Button>} />
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
                      {s.description ?? "—"}
                    </TableCell>
                    <TableCell>{s.classCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <SubjectDialog
                          subject={s}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Modifier
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
                          title={`Supprimer ${s.name} ?`}
                          description="Cette action supprimera la matière et désassociera toutes les classes. Les chapitres et ressources liés seront supprimés."
                          confirmLabel="Supprimer"
                          destructive
                          action={async (formData: FormData) => {
                            "use server";
                            formData.set("id", s.id);
                            await deleteSubject(formData);
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
