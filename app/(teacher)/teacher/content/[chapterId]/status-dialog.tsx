"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  updateResourceStatus,
  type ActionState,
} from "@/lib/actions/resources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function toLocalInput(d: Date | string | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function StatusDialog({
  resource,
  open: openProp,
  onOpenChange,
}: {
  resource: {
    id: string;
    title: string;
    status: "draft" | "scheduled" | "published" | "archived";
    publishedAt: Date | string | null;
    unpublishAt: Date | string | null;
  };
  // Mode contrôlé (depuis un menu) : on fournit open + onOpenChange.
  // Sinon le composant gère son propre bouton + état (page scheduling).
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = (v: boolean) => {
    onOpenChange?.(v);
    if (!controlled) setOpenState(v);
  };
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    updateResourceStatus,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      onOpenChange?.(false);
      setOpenState(false);
    }
  }, [state, onOpenChange]);

  return (
    <>
      {!controlled && (
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          Publication
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resource.title}</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={resource.id} />

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select name="status" defaultValue={resource.status}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="scheduled">Programmé</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="publishedAt">Publication</Label>
                <Input
                  id="publishedAt"
                  name="publishedAt"
                  type="datetime-local"
                  defaultValue={toLocalInput(resource.publishedAt)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unpublishAt">Retrait</Label>
                <Input
                  id="unpublishAt"
                  name="unpublishAt"
                  type="datetime-local"
                  defaultValue={toLocalInput(resource.unpublishAt)}
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
                {pending ? "…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
