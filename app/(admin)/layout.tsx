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
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  Settings,
} from "lucide-react";

const NAV: NavItem[] = [
  { title: "Tableau de bord", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Utilisateurs", url: "/admin/users", icon: Users },
  { title: "Classes", url: "/admin/classes", icon: GraduationCap },
  { title: "Matières", url: "/admin/subjects", icon: BookOpen },
  { title: "Affectations", url: "/admin/assignments", icon: UserCheck },
  { title: "Paramètres", url: "/admin/settings", icon: Settings },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");

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
