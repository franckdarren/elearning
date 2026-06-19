"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuizDialog } from "./quiz-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteQuiz } from "@/lib/actions/quizzes";

type Props = {
  quiz: {
    id: string;
    title: string;
    classId: string;
    subjectId: string;
    chapterId: string | null;
    description: string | null;
    durationMinutes: number | null;
    maxAttempts: number | null;
    opensAt: Date | null;
    closesAt: Date | null;
    status: "draft" | "scheduled" | "published" | "archived";
  };
  assignments: {
    classId: string;
    subjectId: string;
    className: string;
    subjectName: string;
  }[];
  chapters: {
    id: string;
    title: string;
    classId: string;
    subjectId: string;
  }[];
};

export function QuizRowActions({ quiz, assignments, chapters }: Props) {
  async function handleDelete(formData: FormData) {
    formData.set("id", quiz.id);
    await deleteQuiz(formData);
  }

  return (
    <>
      <div className="hidden sm:flex justify-end gap-1">
        <Link href={`/teacher/quizzes/${quiz.id}/edit`}>
          <Button variant="ghost" size="sm">Ouvrir</Button>
        </Link>
        <QuizDialog
          assignments={assignments}
          chapters={chapters}
          quiz={quiz}
          trigger={<Button variant="ghost" size="sm">Paramètres</Button>}
        />
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" className="text-red-600">
              Supprimer
            </Button>
          }
          title={`Supprimer ${quiz.title} ?`}
          description="Les questions, options, tentatives et réponses associées seront supprimées."
          confirmLabel="Supprimer"
          destructive
          successMessage={`QCM "${quiz.title}" supprimé`}
          action={handleDelete}
        />
      </div>

      <div className="flex sm:hidden justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/teacher/quizzes/${quiz.id}/edit`}>Ouvrir</Link>
            </DropdownMenuItem>
            <QuizDialog
              assignments={assignments}
              chapters={chapters}
              quiz={quiz}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Paramètres
                </DropdownMenuItem>
              }
            />
            <DropdownMenuSeparator />
            <ConfirmDialog
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-red-600 focus:text-red-600"
                >
                  Supprimer
                </DropdownMenuItem>
              }
              title={`Supprimer ${quiz.title} ?`}
              description="Les questions, options, tentatives et réponses associées seront supprimées."
              confirmLabel="Supprimer"
              destructive
              successMessage={`QCM "${quiz.title}" supprimé`}
              action={handleDelete}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
