"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { assignManager, type ActionState } from "@/lib/actions/establishments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  otherEstablishmentName: string | null;
};

const NONE = "__none__";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

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

  const currentManager = managers.find((m) => m.id === currentManagerId) ?? null;
  const selectedManager = value !== NONE ? managers.find((m) => m.id === value) ?? null : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionnaire</DialogTitle>
          <DialogDescription>
            {establishmentName}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="establishmentId" value={establishmentId} />
          <input
            type="hidden"
            name="managerId"
            value={value === NONE ? "" : value}
          />

          {/* Gestionnaire actuel */}
          {currentManager ? (
            <div className="flex items-center gap-3 rounded-lg border bg-zinc-50 p-3 dark:bg-zinc-900">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                {initials(currentManager.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{currentManager.fullName}</p>
                <p className="truncate text-xs text-zinc-500">{currentManager.email}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">Actuel</Badge>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-zinc-400">
              Aucun gestionnaire assigné
            </div>
          )}

          {/* Sélecteur */}
          {managers.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucun gestionnaire disponible. Créez d&apos;abord un utilisateur
              avec le rôle « Gestionnaire ».
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Changer le gestionnaire</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Aucun (retirer)</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.fullName}
                      {m.otherEstablishmentName
                        ? ` · gère « ${m.otherEstablishmentName} »`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Détails du gestionnaire sélectionné */}
              {selectedManager && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs text-zinc-500">{selectedManager.email}</p>
                  {selectedManager.otherEstablishmentName && (
                    <p className="text-xs text-amber-600">
                      Ce gestionnaire gère déjà &laquo;&nbsp;{selectedManager.otherEstablishmentName}&nbsp;&raquo; — il sera détaché de cet établissement.
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs text-zinc-400">
                Un gestionnaire ne peut gérer qu&apos;un seul établissement à la fois.
              </p>
            </div>
          )}

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
