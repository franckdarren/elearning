"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, ClipboardList, BarChart2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/teacher/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/teacher/content", label: "Contenus", icon: FolderOpen },
  { href: "/teacher/quizzes", label: "QCM", icon: ClipboardList },
  { href: "/teacher/results", label: "Résultats", icon: BarChart2 },
  { href: "/teacher/progress", label: "Progression", icon: TrendingUp },
];

export function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-row gap-1 overflow-x-auto pb-0.5 lg:flex-col lg:overflow-x-visible lg:pb-0">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
