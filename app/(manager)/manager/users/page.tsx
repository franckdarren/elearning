import { Suspense } from "react";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { and, desc, eq, ilike, inArray, isNull, or, count } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireEstablishment } from "@/lib/auth/permissions";
import { ManagerCreateUserDialog } from "./manager-create-user-dialog";
import { ManagerUserRowActions } from "./manager-user-row-actions";
import { ManagerUsersFilter } from "./manager-users-filter";

export const metadata = { title: "Gestionnaire · Utilisateurs" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<string, string> = {
  teacher: "Enseignant",
  student: "Élève",
};

type Search = {
  role?: string;
  q?: string;
  page?: string;
};

export default async function ManagerUsersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const user = await requireEstablishment();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const roleFilter =
    sp.role === "teacher" || sp.role === "student" ? sp.role : null;
  const q = (sp.q ?? "").trim();

  const filters = [
    isNull(profiles.deletedAt),
    eq(profiles.establishmentId, user.establishmentId),
    roleFilter
      ? eq(profiles.role, roleFilter)
      : inArray(profiles.role, ["teacher", "student"]),
  ];
  if (q.length > 0) {
    filters.push(
      or(
        ilike(profiles.email, `%${q}%`),
        ilike(profiles.firstName, `%${q}%`),
        ilike(profiles.lastName, `%${q}%`),
      )!,
    );
  }
  const where = and(...filters);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: profiles.id,
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        email: profiles.email,
        role: profiles.role,
        isActive: profiles.isActive,
      })
      .from(profiles)
      .where(where)
      .orderBy(desc(profiles.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(profiles).where(where),
  ]);
  const total = totalRow[0]?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>
          <p className="text-sm text-zinc-500">
            {total} enseignant{total > 1 ? "s" : ""} / élève
            {total > 1 ? "s" : ""} dans votre établissement
          </p>
        </div>
        <ManagerCreateUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <ManagerUsersFilter q={q} role={sp.role ?? "all"} />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-zinc-500">Aucun utilisateur.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.firstName} {u.lastName}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{ROLE_LABEL[u.role] ?? u.role}</TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge variant="secondary">Actif</Badge>
                      ) : (
                        <Badge variant="outline">Désactivé</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <ManagerUserRowActions
                        user={{
                          id: u.id,
                          firstName: u.firstName,
                          lastName: u.lastName,
                          email: u.email,
                          role: u.role as "teacher" | "student",
                          isActive: u.isActive,
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

      {pageCount > 1 ? (
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">
            Page {page} / {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <a
                className="underline"
                href={`?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`}
              >
                Précédent
              </a>
            ) : null}
            {page < pageCount ? (
              <a
                className="underline"
                href={`?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`}
              >
                Suivant
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
