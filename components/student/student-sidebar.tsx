"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/student/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/student/subjects", label: "Mes matières", icon: BookOpen },
  { href: "/student/results", label: "Mes résultats", icon: Trophy },
];

export function StudentSidebar() {
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
