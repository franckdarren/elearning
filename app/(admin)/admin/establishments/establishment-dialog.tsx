"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  upsertEstablishment,
  type ActionState,
} from "@/lib/actions/establishments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Establishment = {
  id: string;
  name: string;
  city: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

export function EstablishmentDialog({
  establishment,
  trigger,
}: {
  establishment?: Establishment;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    upsertEstablishment,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {establishment
              ? `Modifier ${establishment.name}`
              : "Nouvel établissement"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {establishment ? (
            <input type="hidden" name="id" value={establishment.id} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              name="name"
              required
              maxLength={120}
              placeholder="Lycée Victor Hugo"
              defaultValue={establishment?.name ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              name="city"
              maxLength={120}
              defaultValue={establishment?.city ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email de contact</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                defaultValue={establishment?.contactEmail ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Téléphone</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                maxLength={40}
                defaultValue={establishment?.contactPhone ?? ""}
              />
            </div>
          </div>

          {state?.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "…" : establishment ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
