import { requireRole } from "@/lib/auth/permissions";
import { DashboardShell } from "@/components/shared/dashboard-shell";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin", "manager"]);
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
