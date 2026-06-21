"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  successMessage = "Opération effectuée",
  action,
  open: openProp,
  onOpenChange,
}: {
  // trigger optionnel : en mode contrôlé (depuis un menu), le dialogue est
  // rendu hors du menu et piloté via open/onOpenChange.
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  successMessage?: string;
  action: (formData: FormData) => void | Promise<void>;
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
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await action(new FormData());
        toast.success(successMessage);
        setOpen(false);
      } catch {
        toast.error("Une erreur est survenue");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) setOpen(v); }}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
