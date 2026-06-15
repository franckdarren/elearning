"use client";

import { deleteResource, moveResource } from "@/lib/actions/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  async function handleDelete(formData: FormData) {
    formData.set("id", r.id);
    await deleteResource(formData);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm">
      <Badge variant="outline" className="w-24 justify-center text-xs">
        {r.type === "video" ? "Vidéo" : "Document"}
      </Badge>
      <span className="flex-1">{r.title}</span>
      <StatusBadge status={r.status} />
      <div className="flex gap-1">
        <form action={moveResource}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="direction" value="up" />
          <Button type="submit" variant="ghost" size="sm">
            ↑
          </Button>
        </form>
        <form action={moveResource}>
          <input type="hidden" name="id" value={r.id} />
          <input type="hidden" name="direction" value="down" />
          <Button type="submit" variant="ghost" size="sm">
            ↓
          </Button>
        </form>
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
    </div>
  );
}
