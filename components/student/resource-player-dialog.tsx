"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SecureVideoPlayer } from "./secure-video-player";
import { DocumentViewer } from "./document-viewer";

type Props = {
  resource: {
    id: string;
    type: "video" | "document";
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
  };
};

export function ResourcePlayerDialog({ resource }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Ouvrir
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{resource.title}</DialogTitle>
          {resource.description ? (
            <p className="text-sm text-zinc-500">{resource.description}</p>
          ) : null}
        </DialogHeader>
        {open ? (
          resource.type === "video" ? (
            <SecureVideoPlayer
              resourceId={resource.id}
              thumbnailUrl={resource.thumbnailUrl}
            />
          ) : (
            <DocumentViewer resourceId={resource.id} />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
