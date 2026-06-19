"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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

      {/* Actions desktop */}
      <div className="hidden shrink-0 gap-1 sm:flex">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={movePending}
          onClick={() => handleMove("up")}
        >
          ↑
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={movePending}
          onClick={() => handleMove("down")}
        >
          ↓
        </Button>
        <ResourcePreviewDialog resourceId={r.id} />
        <StatusDialog
          resource={{
            id: r.id,
            title: r.title,
            status: r.status,
            publishedAt: r.publishedAt,
            unpublishAt: r.unpublishAt,
          }}
        />
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" className="text-red-600">
              Supprimer
            </Button>
          }
          title={`Supprimer ${r.title} ?`}
          description="Le fichier sera supprimé du stockage et la ressource retirée du chapitre."
          confirmLabel="Supprimer"
          destructive
          action={handleDelete}
        />
      </div>

      {/* Actions mobile — menu ⋯ */}
      <div className="shrink-0 sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              ⋯
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
            <ResourcePreviewDialog resourceId={r.id} asMenuItem />
            <StatusDialog
              resource={{
                id: r.id,
                title: r.title,
                status: r.status,
                publishedAt: r.publishedAt,
                unpublishAt: r.unpublishAt,
              }}
              asMenuItem
            />
            <DropdownMenuSeparator />
            <ConfirmDialog
              trigger={
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-red-600 focus:text-red-600"
                >
                  Supprimer
                </DropdownMenuItem>
              }
              title={`Supprimer ${r.title} ?`}
              description="Le fichier sera supprimé du stockage et la ressource retirée du chapitre."
              confirmLabel="Supprimer"
              destructive
              action={handleDelete}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
