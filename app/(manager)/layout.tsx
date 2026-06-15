import { requireRole } from "@/lib/auth/permissions";
import { AppHeader } from "@/components/shared/app-header";
import { ManagerSidebar } from "@/components/manager/manager-sidebar";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin", "manager"]);
  return (
    <>
      <AppHeader
        userId={user.id}
        fullName={user.fullName}
        email={user.email}
        role={user.role}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-6 py-8">
        <aside className="w-56 shrink-0">
          <ManagerSidebar />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
