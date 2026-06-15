import { requireRole } from "@/lib/auth/permissions";
import { DashboardShell } from "@/components/shared/dashboard-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("student");
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
