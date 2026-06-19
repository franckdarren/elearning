"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SubjectDialog } from "./subject-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteSubject } from "@/lib/actions/subjects";

type Props = {
  subject: { id: string; name: string; description: string | null };
};

export function SubjectRowActions({ subject }: Props) {
  async function handleDelete(formData: FormData) {
    formData.set("id", subject.id);
    await deleteSubject(formData);
  }

  return (
    <>
      <div className="hidden sm:flex justify-end gap-1">
        <SubjectDialog
          subject={subject}
          trigger={<Button variant="ghost" size="sm">Modifier</Button>}
        />
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" className="text-red-600">
              Supprimer
            </Button>
          }
          title={`Supprimer ${subject.name} ?`}
          description="Cette action supprimera la matière et désassociera toutes les classes. Les chapitres et ressources liés seront supprimés."
          confirmLabel="Supprimer"
          destructive
          successMessage={`Matière ${subject.name} supprimée`}
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
            <SubjectDialog
              subject={subject}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  Modifier
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
              title={`Supprimer ${subject.name} ?`}
              description="Cette action supprimera la matière et désassociera toutes les classes. Les chapitres et ressources liés seront supprimés."
              confirmLabel="Supprimer"
              destructive
              successMessage={`Matière ${subject.name} supprimée`}
              action={handleDelete}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
