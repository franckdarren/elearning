import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { and, eq, ilike, or, sql, desc, count } from "drizzle-orm";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { ToggleActiveButton } from "./toggle-active-button";

export const metadata = { title: "Admin · Utilisateurs" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  manager: "Gestionnaire",
  teacher: "Enseignant",
  student: "Élève",
};

type Search = {
  role?: string;
  q?: string;
  page?: string;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const roleFilter = sp.role && sp.role !== "all" ? sp.role : null;
  const q = (sp.q ?? "").trim();

  const filters = [];
  if (roleFilter) filters.push(eq(profiles.role, roleFilter as never));
  if (q.length > 0) {
    filters.push(
      or(
        ilike(profiles.email, `%${q}%`),
        ilike(profiles.firstName, `%${q}%`),
        ilike(profiles.lastName, `%${q}%`),
      )!,
    );
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
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
            {total} utilisateur{total > 1 ? "s" : ""} au total
          </p>
        </div>
        <CreateUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="flex-1 min-w-[200px] space-y-2">
              <label htmlFor="q" className="text-xs font-medium">
                Recherche
              </label>
              <Input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Email, prénom ou nom…"
              />
            </div>
            <div className="w-48 space-y-2">
              <label htmlFor="role" className="text-xs font-medium">
                Rôle
              </label>
              <Select name="role" defaultValue={sp.role ?? "all"}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                  <SelectItem value="manager">Gestionnaire</SelectItem>
                  <SelectItem value="teacher">Enseignant</SelectItem>
                  <SelectItem value="student">Élève</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </form>
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
                      <div className="flex justify-end gap-1">
                        <EditUserDialog
                          user={{
                            id: u.id,
                            firstName: u.firstName,
                            lastName: u.lastName,
                            email: u.email,
                            role: u.role as never,
                            isActive: u.isActive,
                          }}
                        />
                        <ToggleActiveButton id={u.id} isActive={u.isActive} />
                      </div>
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
