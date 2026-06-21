"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getTeacherResourceSignedUrl } from "@/lib/actions/teacher-resources";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "video"; title: string; signedUrl: string }
  | { status: "document"; title: string; signedUrl: string; downloadable: boolean };

export function ResourcePreviewDialog({
  resourceId,
  open,
  onOpenChange,
}: {
  resourceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, setState] = useState<State>({ status: "idle" });

  // Charge l'URL signée à la première ouverture (le dialogue est désormais
  // rendu hors du menu déroulant, donc il persiste à la fermeture du menu).
  useEffect(() => {
    if (!open || state.status !== "idle") return;
    let cancelled = false;
    setState({ status: "loading" });
    getTeacherResourceSignedUrl(resourceId).then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setState({ status: "error", error: r.error });
      } else if (r.type === "video") {
        setState({ status: "video", title: r.title, signedUrl: r.signedUrl });
      } else {
        setState({
          status: "document",
          title: r.title,
          signedUrl: r.signedUrl,
          downloadable: r.downloadable,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, state.status, resourceId]);

  const title =
    state.status === "video" || state.status === "document"
      ? state.title
      : "Aperçu";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="min-h-40">
          {state.status === "loading" && (
            <p className="py-8 text-center text-sm text-zinc-500">Chargement…</p>
          )}
          {state.status === "error" && (
            <p className="py-8 text-center text-sm text-red-600">{state.error}</p>
          )}
          {state.status === "video" && (
            <video
              src={state.signedUrl}
              controls
              controlsList="nodownload noremoteplayback"
              disablePictureInPicture
              playsInline
              onContextMenu={(e) => e.preventDefault()}
              className="aspect-video w-full rounded-md bg-black"
            />
          )}
          {state.status === "document" && (
            <iframe
              src={state.signedUrl}
              className="h-[60vh] w-full rounded-md border border-zinc-200 dark:border-zinc-800"
              title="Aperçu document"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
