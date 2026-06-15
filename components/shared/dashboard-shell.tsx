import { AppHeader } from "./app-header";
import type { CurrentUser } from "@/lib/auth/permissions";

export function DashboardShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  return (
    <>
      <AppHeader
        userId={user.id}
        fullName={user.fullName}
        email={user.email}
        role={user.role}
      />
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</div>
    </>
  );
}
