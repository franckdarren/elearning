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
import { ClassDialog } from "./class-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteClass } from "@/lib/actions/classes";

type Props = {
  cls: {
    id: string;
    name: string;
    level: string;
    description: string | null;
    academicYearId: string | null;
    establishmentId: string;
    subjectIds: string[];
  };
  subjects: { id: string; name: string; establishmentId: string }[];
  years: { id: string; label: string }[];
};

export function ClassRowActions({ cls, subjects, years }: Props) {
  async function handleDelete(formData: FormData) {
    formData.set("id", cls.id);
    await deleteClass(formData);
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ClassDialog
            cls={cls}
            subjects={subjects}
            years={years}
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
            title={`Supprimer ${cls.name} ?`}
            description="Les inscriptions, accès, chapitres et quiz de cette classe seront supprimés."
            confirmLabel="Supprimer"
            destructive
            successMessage={`Classe ${cls.name} supprimée`}
            action={handleDelete}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
