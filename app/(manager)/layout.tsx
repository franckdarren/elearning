import { requireRole } from "@/lib/auth/permissions";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/shared/app-sidebar";
import { NavBreadcrumb } from "@/components/shared/nav-breadcrumb";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin", "manager"]);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header
          aria-label="Navigation principale"
          className="flex h-14 shrink-0 items-center gap-2 border-b px-4"
        >
          <SidebarTrigger className="-ml-1" aria-label="Ouvrir/fermer le menu" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <NavBreadcrumb />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell userId={user.id} />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
