"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleUserActive } from "@/lib/actions/users";
import { Button } from "@/components/ui/button";

export function ToggleActiveButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const fd = new FormData();
    fd.set("id", id);
    startTransition(async () => {
      try {
        await toggleUserActive(fd);
        toast.success(isActive ? "Utilisateur désactivé" : "Utilisateur réactivé");
      } catch {
        toast.error("Erreur lors de la mise à jour");
      }
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        isActive ? "Désactiver" : "Réactiver"
      )}
    </Button>
  );
}