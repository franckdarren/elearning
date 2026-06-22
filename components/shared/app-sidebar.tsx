"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart2,
  BookOpen,
  Building2,
  Calendar,
  ChevronsUpDown,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { recordSignOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/auth/permissions";

type NavItem = {
  title: string;
  url: string;
  icon: React.ElementType;
};

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: [
    { title: "Tableau de bord", url: "/admin/dashboard", icon: LayoutDashboard },
    { title: "Établissements", url: "/admin/establishments", icon: Building2 },
    { title: "Utilisateurs", url: "/admin/users", icon: Users },
    { title: "Classes", url: "/admin/classes", icon: GraduationCap },
    { title: "Matières", url: "/admin/subjects", icon: BookOpen },
    { title: "Affectations", url: "/admin/assignments", icon: UserCheck },
    { title: "Paramètres", url: "/admin/settings", icon: Settings },
  ],
  manager: [
    { title: "Tableau de bord", url: "/manager/dashboard", icon: LayoutDashboard },
    { title: "Utilisateurs", url: "/manager/users", icon: Users },
    { title: "Classes", url: "/manager/classes", icon: GraduationCap },
    { title: "Matières", url: "/manager/subjects", icon: BookOpen },
    { title: "Affectations", url: "/manager/assignments", icon: UserCheck },
    { title: "Contenus", url: "/manager/content", icon: FolderOpen },
    { title: "QCM", url: "/manager/quizzes", icon: ClipboardList },
    { title: "Résultats", url: "/manager/results", icon: BarChart2 },
    { title: "Programmation", url: "/manager/scheduling", icon: Calendar },
  ],
  teacher: [
    { title: "Tableau de bord", url: "/teacher/dashboard", icon: LayoutDashboard },
    { title: "Contenus", url: "/teacher/content", icon: FolderOpen },
    { title: "QCM", url: "/teacher/quizzes", icon: ClipboardList },
    { title: "Résultats", url: "/teacher/results", icon: BarChart2 },
  ],
  student: [
    { title: "Tableau de bord", url: "/student/dashboard", icon: LayoutDashboard },
    { title: "Mes matières", url: "/student/subjects", icon: BookOpen },
    { title: "Mes résultats", url: "/student/results", icon: Trophy },
  ],
};

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Administrateur",
  manager: "Gestionnaire",
  teacher: "Enseignant",
  student: "Élève",
};

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function AppSidebar({
  user,
}: {
  user: { id: string; fullName: string | null; email: string; role: UserRole };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navItems = NAV_BY_ROLE[user.role] ?? [];
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    setPendingUrl(null);
  }, [pathname]);

  function navigate(url: string) {
    if (url === pathname) return;
    if (isMobile) setOpenMobile(false);
    setPendingUrl(url);
    router.push(url);
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <span className="text-xs font-bold">PS</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">La-Passerelle</span>
                  <span className="text-xs text-muted-foreground">Du Savoir</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ title, url, icon: Icon }) => {
                const active = pathname === url || pathname.startsWith(url + "/");
                const loading = pendingUrl === url;
                const isActive = active || loading;
                return (
                  <SidebarMenuItem key={url}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={title}
                      onClick={() => navigate(url)}
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Icon />
                      )}
                      <span>{title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg text-xs font-medium">
                      {getInitials(user.fullName, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col gap-0.5 leading-none text-left text-sm">
                    <span className="truncate font-medium">
                      {user.fullName || user.email}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {ROLE_LABEL[user.role]}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
                side="top"
                align="start"
                sideOffset={4}
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">
                      {user.fullName || user.email}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  asChild
                  onSelect={(e) => e.preventDefault()}
                >
                  <button
                    type="button"
                    className="w-full cursor-pointer"
                    disabled={isSigningOut}
                    onClick={() => {
                      setIsSigningOut(true);
                      void recordSignOut(user.id);
                      const supabase = createClient();
                      void supabase.auth.signOut({ scope: "local" }).then(() => {
                        router.replace("/login");
                        router.refresh();
                      });
                    }}
                  >
                    {isSigningOut ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {isSigningOut ? "Déconnexion…" : "Se déconnecter"}
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
