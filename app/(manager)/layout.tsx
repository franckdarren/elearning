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
  GraduationCap,
  BookOpen,
  UserCheck,
  Calendar,
} from "lucide-react";

const NAV: NavItem[] = [
  { title: "Tableau de bord", url: "/manager/dashboard", icon: LayoutDashboard },
  { title: "Classes", url: "/manager/classes", icon: GraduationCap },
  { title: "Matières", url: "/manager/subjects", icon: BookOpen },
  { title: "Affectations", url: "/manager/assignments", icon: UserCheck },
  { title: "Programmation", url: "/manager/scheduling", icon: Calendar },
];

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin", "manager"]);

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
