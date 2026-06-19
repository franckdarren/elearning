import { db } from "@/lib/db";
import { establishments, profiles } from "@/lib/db/schema";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
import { EstablishmentDialog } from "./establishment-dialog";
import { EstablishmentRowActions } from "./establishment-row-actions";

export const metadata = { title: "Admin · Établissements" };
export const dynamic = "force-dynamic";

export default async function EstablishmentsPage() {
  const manager = alias(profiles, "manager");

  const [rows, managerRows] = await Promise.all([
    db
      .select({
        id: establishments.id,
        name: establishments.name,
        city: establishments.city,
        contactEmail: establishments.contactEmail,
        contactPhone: establishments.contactPhone,
        isActive: establishments.isActive,
        managerId: establishments.managerId,
        managerFirstName: manager.firstName,
        managerLastName: manager.lastName,
        classCount:
          sql<number>`(select count(*) from classes c where c.establishment_id = ${establishments.id})`.mapWith(
            Number,
          ),
        subjectCount:
          sql<number>`(select count(*) from subjects s where s.establishment_id = ${establishments.id})`.mapWith(
            Number,
          ),
        userCount:
          sql<number>`(select count(*) from profiles p where p.establishment_id = ${establishments.id} and p.deleted_at is null)`.mapWith(
            Number,
          ),
      })
      .from(establishments)
      .leftJoin(manager, eq(manager.id, establishments.managerId))
      .orderBy(desc(establishments.createdAt)),
    // Tous les gestionnaires + leur établissement déjà géré (pour le sélecteur).
    db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        email: profiles.email,
        otherEstablishmentName: establishments.name,
      })
      .from(profiles)
      .leftJoin(establishments, eq(establishments.managerId, profiles.id))
      .where(and(eq(profiles.role, "manager"), isNull(profiles.deletedAt)))
      .orderBy(asc(profiles.lastName)),
  ]);

  const managers = managerRows.map((m) => ({
    id: m.id,
    fullName: [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email,
    email: m.email,
    otherEstablishmentName: m.otherEstablishmentName,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Établissements</h1>
          <p className="text-sm text-zinc-500">
            {rows.length} établissement{rows.length > 1 ? "s" : ""}
          </p>
        </div>
        <EstablishmentDialog
          trigger={<Button>Nouvel établissement</Button>}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">
              Aucun établissement. Créez-en un puis attribuez-le à un
              gestionnaire.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Gestionnaire</TableHead>
                  <TableHead>Classes</TableHead>
                  <TableHead>Matières</TableHead>
                  <TableHead>Utilisateurs</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((e) => {
                  const managerName =
                    [e.managerFirstName, e.managerLastName]
                      .filter(Boolean)
                      .join(" ") || null;
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>
                        {e.city ?? <span className="text-zinc-400">—</span>}
                      </TableCell>
                      <TableCell>
                        {managerName ?? (
                          <Badge variant="outline">Non attribué</Badge>
                        )}
                      </TableCell>
                      <TableCell>{e.classCount}</TableCell>
                      <TableCell>{e.subjectCount}</TableCell>
                      <TableCell>{e.userCount}</TableCell>
                      <TableCell>
                        {e.isActive ? (
                          <Badge variant="secondary">Actif</Badge>
                        ) : (
                          <Badge variant="outline">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <EstablishmentRowActions
                          establishment={{
                            id: e.id,
                            name: e.name,
                            city: e.city,
                            contactEmail: e.contactEmail,
                            contactPhone: e.contactPhone,
                            managerId: e.managerId,
                          }}
                          managers={managers}
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
    </div>
  );
}
