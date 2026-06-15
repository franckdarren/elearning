"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const PAGE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Gestionnaire",
  teacher: "Enseignant",
  student: "Élève",
  dashboard: "Tableau de bord",
  users: "Utilisateurs",
  classes: "Classes",
  subjects: "Matières",
  assignments: "Affectations",
  settings: "Paramètres",
  scheduling: "Programmation",
  content: "Contenus",
  quizzes: "QCM",
  results: "Résultats",
  chapter: "Chapitre",
  quiz: "Quiz",
};

export function NavBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  // /admin/dashboard → ["admin", "dashboard"]
  const roleSegment = segments[0];
  const pageSegment = segments[1] ?? roleSegment;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href="#">Plateforme</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>
            {PAGE_LABELS[pageSegment] ?? pageSegment}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
