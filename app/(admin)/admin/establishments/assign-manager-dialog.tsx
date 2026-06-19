"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { assignManager, type ActionState } from "@/lib/actions/establishments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Manager = {
  id: string;
  fullName: string;
  email: string;
  // établissement déjà géré par ce gestionnaire (autre que le courant), le cas échéant
  otherEstablishmentName: string | null;
};

const NONE = "__none__";

export function AssignManagerDialog({
  establishmentId,
  establishmentName,
  currentManagerId,
  managers,
  trigger,
}: {
  establishmentId: string;
  establishmentName: string;
  currentManagerId: string | null;
  managers: Manager[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentManagerId ?? NONE);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    assignManager,
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
          <DialogTitle>Gestionnaire de {establishmentName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="establishmentId" value={establishmentId} />
          <input
            type="hidden"
            name="managerId"
            value={value === NONE ? "" : value}
          />

          <div className="space-y-2">
            <Label>Gestionnaire</Label>
            <Select value={value} onValueChange={setValue}>
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucun (retirer)</SelectItem>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.fullName} · {m.email}
                    {m.otherEstablishmentName
                      ? ` (gère « ${m.otherEstablishmentName} »)`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500">
              Un gestionnaire ne peut gérer qu&apos;un seul établissement. En
              choisir un déjà attribué le détachera de son établissement actuel.
            </p>
          </div>

          {managers.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucun gestionnaire disponible. Créez d&apos;abord un utilisateur
              avec le rôle « Gestionnaire ».
            </p>
          ) : null}

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
              {pending ? "…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
