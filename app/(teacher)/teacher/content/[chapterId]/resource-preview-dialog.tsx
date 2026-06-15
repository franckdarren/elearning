"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
}: {
  resourceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ status: "idle" });

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && state.status === "idle") {
      setState({ status: "loading" });
      const r = await getTeacherResourceSignedUrl(resourceId);
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
    }
  }

  const title =
    state.status === "video" || state.status === "document"
      ? state.title
      : "Aperçu";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Aperçu
        </Button>
      </DialogTrigger>
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
