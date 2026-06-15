import { requireRole } from "@/lib/auth/permissions";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar, type NavItem } from "@/components/shared/app-sidebar";
import { NavBreadcrumb } from "@/components/shared/nav-breadcrumb";
import { NotificationBell } from "@/components/shared/notification-bell";
import {
  LayoutDashboard,
  FolderOpen,
  ClipboardList,
  BarChart2,
} from "lucide-react";

const NAV: NavItem[] = [
  { title: "Tableau de bord", url: "/teacher/dashboard", icon: LayoutDashboard },
  { title: "Contenus", url: "/teacher/content", icon: FolderOpen },
  { title: "QCM", url: "/teacher/quizzes", icon: ClipboardList },
  { title: "Résultats", url: "/teacher/results", icon: BarChart2 },
];

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin", "teacher"]);

  return (
    <SidebarProvider>
      <AppSidebar navItems={NAV} user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <NavBreadcrumb />
          <div className="ml-auto">
            <NotificationBell userId={user.id} />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
