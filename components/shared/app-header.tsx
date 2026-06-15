import Link from "next/link";
import { LogoutButton } from "./logout-button";
import type { UserRole } from "@/lib/auth/permissions";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrateur",
  manager: "Gestionnaire",
  teacher: "Enseignant",
  student: "Élève",
};

export function AppHeader({
  fullName,
  email,
  role,
}: {
  fullName: string | null;
  email: string;
  role: UserRole;
}) {
  return (
    <header className="border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          La-Passerelle Du Savoir
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden text-right text-xs sm:block">
            <div className="font-medium">{fullName || email}</div>
            <div className="text-zinc-500">{ROLE_LABEL[role]}</div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
