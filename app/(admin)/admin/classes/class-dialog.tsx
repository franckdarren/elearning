"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { upsertClass, type ActionState } from "@/lib/actions/classes";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Subject = { id: string; name: string; establishmentId: string };
type Year = { id: string; label: string };
type Establishment = { id: string; name: string };

type Props = {
  cls?: {
    id: string;
    name: string;
    level: string;
    description: string | null;
    academicYearId: string | null;
    establishmentId: string;
    subjectIds: string[];
  };
  subjects: Subject[];
  years: Year[];
  // Fournie côté admin (choix de l'établissement) ; omise côté gestionnaire.
  establishments?: Establishment[];
  trigger: React.ReactNode;
};

export function ClassDialog({
  cls,
  subjects,
  years,
  establishments,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    upsertClass,
    null,
  );

  // Établissement sélectionné (admin). En édition, fixé à celui de la classe.
  const [establishmentId, setEstablishmentId] = useState<string>(
    cls?.establishmentId ?? establishments?.[0]?.id ?? "",
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setOpen(false);
    }
  }, [state]);

  // Côté admin on filtre les matières par établissement ; côté gestionnaire
  // (pas de prop establishments) les matières reçues sont déjà cloisonnées.
  const visibleSubjects = establishments
    ? subjects.filter((s) => s.establishmentId === establishmentId)
    : subjects;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {cls ? `Modifier ${cls.name}` : "Nouvelle classe"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {cls ? <input type="hidden" name="id" value={cls.id} /> : null}

          {!cls && establishments ? (
            <div className="space-y-2">
              <Label htmlFor="establishmentId">Établissement</Label>
              <Select
                value={establishmentId}
                onValueChange={setEstablishmentId}
              >
                <SelectTrigger id="establishmentId">
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {establishments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                name="establishmentId"
                value={establishmentId}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="3ème A"
                defaultValue={cls?.name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Niveau</Label>
              <Input
                id="level"
                name="level"
                required
                placeholder="3ème"
                defaultValue={cls?.level ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              defaultValue={cls?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="academicYearId">Année scolaire</Label>
            <Select
              name="academicYearId"
              defaultValue={cls?.academicYearId ?? ""}
            >
              <SelectTrigger id="academicYearId">
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Matières proposées</Label>
            {visibleSubjects.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Aucune matière pour cet établissement. Créez-en une dans la page
                Matières.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {visibleSubjects.map((s) => (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="subjectIds"
                      value={s.id}
                      defaultChecked={cls?.subjectIds.includes(s.id) ?? false}
                      className="h-4 w-4"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
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
              {pending ? "…" : cls ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
