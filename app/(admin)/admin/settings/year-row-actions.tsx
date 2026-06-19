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
import { YearDialog } from "./year-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteAcademicYear } from "@/lib/actions/academic-years";

type Props = {
  year: {
    id: string;
    label: string;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean | null;
  };
};

export function YearRowActions({ year }: Props) {
  async function handleDelete(formData: FormData) {
    formData.set("id", year.id);
    await deleteAcademicYear(formData);
  }

  return (
    <>
      <div className="hidden sm:flex justify-end gap-1">
        <YearDialog
          year={year}
          trigger={<Button variant="ghost" size="sm">Modifier</Button>}
        />
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" className="text-red-600">
              Supprimer
            </Button>
          }
          title={`Supprimer ${year.label} ?`}
          description="Les classes rattachées à cette année perdront leur rattachement."
          confirmLabel="Supprimer"
          destructive
          successMessage={`Année ${year.label} supprimée`}
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
            <YearDialog
              year={year}
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
              title={`Supprimer ${year.label} ?`}
              description="Les classes rattachées à cette année perdront leur rattachement."
              confirmLabel="Supprimer"
              destructive
              successMessage={`Année ${year.label} supprimée`}
              action={handleDelete}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
