import { requireRole } from "@/lib/auth/permissions";
import { DashboardShell } from "@/components/shared/dashboard-shell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin", "teacher"]);
  return <DashboardShell user={user}>{children}</DashboardShell>;
}
