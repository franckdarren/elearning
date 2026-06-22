import { db } from "@/lib/db";
import { academicYears } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth/permissions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { YearDialog } from "@/components/shared/year-dialog";
import { YearRowActions } from "@/components/shared/year-row-actions";

export const metadata = { title: "Gestionnaire · Paramètres" };
export const dynamic = "force-dynamic";

export default async function ManagerSettingsPage() {
  await requireRole(["admin", "manager"]);

  const years = await db
    .select()
    .from(academicYears)
    .orderBy(desc(academicYears.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-zinc-500">Années scolaires.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Années scolaires</CardTitle>
          <YearDialog trigger={<Button size="sm">Ajouter</Button>} />
        </CardHeader>
        <CardContent className="p-0">
          {years.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              Aucune année déclarée pour le moment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {years.map((y) => (
                  <TableRow key={y.id}>
                    <TableCell className="font-medium">{y.label}</TableCell>
                    <TableCell>{y.startDate ?? "—"}</TableCell>
                    <TableCell>{y.endDate ?? "—"}</TableCell>
                    <TableCell>
                      {y.isCurrent ? (
                        <Badge>Courante</Badge>
                      ) : (
                        <Badge variant="outline">—</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <YearRowActions year={y} />
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
