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
import { EstablishmentDialog } from "./establishment-dialog";
import { AssignManagerDialog } from "./assign-manager-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteEstablishment } from "@/lib/actions/establishments";

type Manager = {
  id: string;
  fullName: string;
  email: string;
  otherEstablishmentName: string | null;
};

type Establishment = {
  id: string;
  name: string;
  city: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  managerId: string | null;
};

export function EstablishmentRowActions({
  establishment,
  managers,
}: {
  establishment: Establishment;
  managers: Manager[];
}) {
  async function handleDelete(formData: FormData) {
    formData.set("id", establishment.id);
    await deleteEstablishment(formData);
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
          <AssignManagerDialog
            establishmentId={establishment.id}
            establishmentName={establishment.name}
            currentManagerId={establishment.managerId}
            managers={managers}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Gestionnaire
              </DropdownMenuItem>
            }
          />
          <EstablishmentDialog
            establishment={establishment}
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
            title={`Supprimer ${establishment.name} ?`}
            description="Cette action supprimera l'établissement ainsi que ses classes et matières (et leurs contenus). Les utilisateurs seront détachés."
            confirmLabel="Supprimer"
            destructive
            successMessage={`Établissement ${establishment.name} supprimé`}
            action={handleDelete}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
