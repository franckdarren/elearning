"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { deleteResource, moveResource } from "@/lib/actions/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusDialog } from "./status-dialog";
import { ResourcePreviewDialog } from "./resource-preview-dialog";

const STATUS_LABEL = {
  draft: "Brouillon",
  scheduled: "Programmé",
  published: "Publié",
  archived: "Archivé",
} as const;

type ResourceRowProps = {
  r: {
    id: string;
    type: "video" | "document";
    title: string;
    status: "draft" | "scheduled" | "published" | "archived";
    publishedAt: Date | string | null;
    unpublishAt: Date | string | null;
    position: number;
  };
};

function StatusBadge({ status }: { status: keyof typeof STATUS_LABEL }) {
  const variant =
    status === "published"
      ? "default"
      : status === "scheduled"
        ? "secondary"
        : "outline";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}

export function ResourceRow({ r }: ResourceRowProps) {
  const [movePending, startMove] = useTransition();
  // Les dialogues sont rendus HORS du DropdownMenu : sinon la fermeture du
  // menu démonte leur contenu et ils ne s'ouvrent jamais.
  const [activeDialog, setActiveDialog] = useState<
    null | "preview" | "status" | "delete"
  >(null);

  function handleMove(direction: "up" | "down") {
    const fd = new FormData();
    fd.set("id", r.id);
    fd.set("direction", direction);
    startMove(async () => {
      try {
        await moveResource(fd);
      } catch {
        toast.error("Erreur lors du déplacement");
      }
    });
  }

  async function handleDelete(formData: FormData) {
    formData.set("id", r.id);
    try {
      await deleteResource(formData);
      toast.success(`"${r.title}" supprimé`);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm">
      <Badge variant="outline" className="w-20 shrink-0 justify-center text-xs">
        {r.type === "video" ? "Vidéo" : "Document"}
      </Badge>
      <span className="min-w-0 flex-1 truncate">{r.title}</span>
      <StatusBadge status={r.status} />

      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              disabled={movePending}
              onSelect={() => handleMove("up")}
            >
              ↑ Monter
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={movePending}
              onSelect={() => handleMove("down")}
            >
              ↓ Descendre
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setActiveDialog("preview")}>
              Aperçu
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setActiveDialog("status")}>
              Publication
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setActiveDialog("delete")}
              className="text-red-600 focus:text-red-600"
            >
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dialogues rendus hors du menu pour survivre à sa fermeture. */}
      <ResourcePreviewDialog
        resourceId={r.id}
        open={activeDialog === "preview"}
        onOpenChange={(o) => setActiveDialog(o ? "preview" : null)}
      />
      <StatusDialog
        resource={{
          id: r.id,
          title: r.title,
          status: r.status,
          publishedAt: r.publishedAt,
          unpublishAt: r.unpublishAt,
        }}
        open={activeDialog === "status"}
        onOpenChange={(o) => setActiveDialog(o ? "status" : null)}
      />
      <ConfirmDialog
        open={activeDialog === "delete"}
        onOpenChange={(o) => setActiveDialog(o ? "delete" : null)}
        title={`Supprimer ${r.title} ?`}
        description="Le fichier sera supprimé du stockage et la ressource retirée du chapitre."
        confirmLabel="Supprimer"
        destructive
        action={handleDelete}
      />
    </div>
  );
}
