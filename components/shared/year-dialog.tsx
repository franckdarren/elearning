"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  upsertAcademicYear,
  type ActionState,
} from "@/lib/actions/academic-years";
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

type Props = {
  year?: {
    id: string;
    label: string;
    startDate: string | null;
    endDate: string | null;
    isCurrent: boolean | null;
  };
  trigger: React.ReactNode;
};

export function YearDialog({ year, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    upsertAcademicYear,
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
            {year ? `Modifier ${year.label}` : "Nouvelle année scolaire"}
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {year ? <input type="hidden" name="id" value={year.id} /> : null}
          <div className="space-y-2">
            <Label htmlFor="label">Libellé</Label>
            <Input
              id="label"
              name="label"
              required
              placeholder="2025-2026"
              defaultValue={year?.label ?? ""}
              maxLength={40}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="startDate">Début</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={year?.startDate ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fin</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={year?.endDate ?? ""}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCurrent"
              name="isCurrent"
              value="true"
              defaultChecked={year?.isCurrent ?? false}
              className="h-4 w-4"
            />
            <Label htmlFor="isCurrent" className="cursor-pointer">
              Année courante
            </Label>
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
              {pending ? "…" : year ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
