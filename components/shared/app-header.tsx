import Link from "next/link";
import { LogoutButton } from "./logout-button";
import { NotificationBell } from "./notification-bell";
import type { UserRole } from "@/lib/auth/permissions";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrateur",
  manager: "Gestionnaire",
  teacher: "Enseignant",
  student: "Élève",
};

export function AppHeader({
  userId,
  fullName,
  email,
  role,
}: {
  userId: string;
  fullName: string | null;
  email: string;
  role: UserRole;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          La-Passerelle Du Savoir
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right text-xs sm:block">
            <div className="font-medium leading-tight">{fullName || email}</div>
            <div className="text-zinc-500">{ROLE_LABEL[role]}</div>
          </div>
          <NotificationBell userId={userId} />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
