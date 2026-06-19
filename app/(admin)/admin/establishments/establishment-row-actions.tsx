"use client";

import { Button } from "@/components/ui/button";
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
    <div className="flex justify-end gap-1">
      <AssignManagerDialog
        establishmentId={establishment.id}
        establishmentName={establishment.name}
        currentManagerId={establishment.managerId}
        managers={managers}
        trigger={
          <Button variant="ghost" size="sm">
            Gestionnaire
          </Button>
        }
      />
      <EstablishmentDialog
        establishment={establishment}
        trigger={
          <Button variant="ghost" size="sm">
            Modifier
          </Button>
        }
      />
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="sm" className="text-red-600">
            Supprimer
          </Button>
        }
        title={`Supprimer ${establishment.name} ?`}
        description="Cette action supprimera l'établissement ainsi que ses classes et matières (et leurs contenus). Les utilisateurs seront détachés."
        confirmLabel="Supprimer"
        destructive
        successMessage={`Établissement ${establishment.name} supprimé`}
        action={handleDelete}
      />
    </div>
  );
}
