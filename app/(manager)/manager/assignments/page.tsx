import { db } from "@/lib/db";
import {
  profiles,
  classes,
  subjects,
  teacherAssignments,
  studentEnrollments,
  studentSubjectAccess,
  classSubjects,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TeacherAssignmentForm } from "@/app/(admin)/admin/assignments/teacher-assignment-form";
import { StudentScopeDialog } from "@/app/(admin)/admin/assignments/student-scope-dialog";
import { deleteTeacherAssignment } from "@/lib/actions/assignments";

export const metadata = { title: "Gestionnaire · Affectations" };
export const dynamic = "force-dynamic";

export default async function ManagerAssignmentsPage() {
  const [
    teachers,
    students,
    classesRows,
    subjectsRows,
    assignmentsRows,
    classSubjRows,
    enrollments,
    accesses,
  ] = await Promise.all([
    db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
      })
      .from(profiles)
      .where(eq(profiles.role, "teacher"))
      .orderBy(asc(profiles.lastName)),
    db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        email: profiles.email,
      })
      .from(profiles)
      .where(eq(profiles.role, "student"))
      .orderBy(asc(profiles.lastName)),
    db
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .orderBy(classes.name),
    db
      .select({ id: subjects.id, name: subjects.name })
      .from(subjects)
      .orderBy(subjects.name),
    db
      .select({
        id: teacherAssignments.id,
        teacherFirstName: profiles.firstName,
        teacherLastName: profiles.lastName,
        className: classes.name,
        subjectName: subjects.name,
      })
      .from(teacherAssignments)
      .innerJoin(profiles, eq(profiles.id, teacherAssignments.teacherId))
      .innerJoin(classes, eq(classes.id, teacherAssignments.classId))
      .innerJoin(subjects, eq(subjects.id, teacherAssignments.subjectId))
      .orderBy(asc(profiles.lastName), asc(classes.name), asc(subjects.name)),
    db
      .select({
        classId: classes.id,
        className: classes.name,
        subjectId: subjects.id,
        subjectName: subjects.name,
      })
      .from(classes)
      .leftJoin(classSubjects, eq(classSubjects.classId, classes.id))
      .leftJoin(subjects, eq(subjects.id, classSubjects.subjectId))
      .orderBy(asc(classes.name), asc(subjects.name)),
    db
      .select({
        studentId: studentEnrollments.studentId,
        classId: studentEnrollments.classId,
      })
      .from(studentEnrollments),
    db
      .select({
        studentId: studentSubjectAccess.studentId,
        subjectId: studentSubjectAccess.subjectId,
      })
      .from(studentSubjectAccess),
  ]);

  const classMap = new Map<
    string,
    { id: string; name: string; subjects: { id: string; name: string }[] }
  >();
  for (const r of classSubjRows) {
    if (!classMap.has(r.classId)) {
      classMap.set(r.classId, {
        id: r.classId,
        name: r.className,
        subjects: [],
      });
    }
    if (r.subjectId && r.subjectName) {
      classMap
        .get(r.classId)!
        .subjects.push({ id: r.subjectId, name: r.subjectName });
    }
  }
  const classesForDialog = Array.from(classMap.values());

  const enrollmentMap = new Map(enrollments.map((e) => [e.studentId, e.classId]));
  const accessMap = new Map<string, string[]>();
  for (const a of accesses) {
    if (!accessMap.has(a.studentId)) accessMap.set(a.studentId, []);
    accessMap.get(a.studentId)!.push(a.subjectId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Affectations</h1>
        <p className="text-sm text-zinc-500">
          Affecter les enseignants et gérer le périmètre des élèves.
        </p>
      </div>

      <Tabs defaultValue="teachers">
        <TabsList>
          <TabsTrigger value="teachers">Enseignants</TabsTrigger>
          <TabsTrigger value="students">Élèves</TabsTrigger>
        </TabsList>

        <TabsContent value="teachers" className="space-y-4 pt-4">
          <Card>
            <CardContent className="pt-6">
              <TeacherAssignmentForm
                teachers={teachers.map((t) => ({
                  id: t.id,
                  label: `${t.firstName} ${t.lastName}`,
                }))}
                classes={classesRows.map((c) => ({ id: c.id, label: c.name }))}
                subjects={subjectsRows.map((s) => ({ id: s.id, label: s.name }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {assignmentsRows.length === 0 ? (
                <p className="p-6 text-sm text-zinc-500">
                  Aucune affectation pour le moment.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Enseignant</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Matière</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignmentsRows.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.teacherFirstName} {a.teacherLastName}
                        </TableCell>
                        <TableCell>{a.className}</TableCell>
                        <TableCell>{a.subjectName}</TableCell>
                        <TableCell className="text-right">
                          <ConfirmDialog
                            trigger={
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600"
                              >
                                Retirer
                              </Button>
                            }
                            title="Retirer cette affectation ?"
                            confirmLabel="Retirer"
                            destructive
                            successMessage="Affectation retirée"
                            action={async (formData: FormData) => {
                              "use server";
                              formData.set("id", a.id);
                              await deleteTeacherAssignment(formData);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4 pt-4">
          <Card>
            <CardContent className="p-0">
              {students.length === 0 ? (
                <p className="p-6 text-sm text-zinc-500">Aucun élève.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Élève</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Matières autorisées</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => {
                      const classId = enrollmentMap.get(s.id) ?? null;
                      const className =
                        classId &&
                        classesForDialog.find((c) => c.id === classId)?.name;
                      const granted = accessMap.get(s.id) ?? [];
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            {s.firstName} {s.lastName}
                          </TableCell>
                          <TableCell>{s.email}</TableCell>
                          <TableCell>
                            {className ?? (
                              <span className="text-zinc-400">Non inscrit</span>
                            )}
                          </TableCell>
                          <TableCell>{granted.length}</TableCell>
                          <TableCell className="text-right">
                            <StudentScopeDialog
                              student={{
                                id: s.id,
                                firstName: s.firstName,
                                lastName: s.lastName,
                                email: s.email,
                                classId,
                                grantedSubjectIds: granted,
                              }}
                              classes={classesForDialog}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  Gérer
                                </Button>
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
