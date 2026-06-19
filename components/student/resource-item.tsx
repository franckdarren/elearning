"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Play, FileText, ChevronRight, CheckCircle2 } from "lucide-react";
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
  isNew: boolean;
  watched: boolean;
};

export function ResourceItem({ resource, isNew, watched }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/50 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors min-h-[64px] cursor-pointer"
      >
        <div
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            resource.type === "video"
              ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
              : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          }`}
        >
          {resource.type === "video" ? (
            <Play className="w-5 h-5" fill="currentColor" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
              {resource.title}
            </span>
            {isNew && (
              <Badge variant="default" className="text-xs shrink-0">
                Nouveau
              </Badge>
            )}
          </div>
          {resource.description ? (
            <div className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
              {resource.description}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {watched && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          <ChevronRight className="w-4 h-4 text-zinc-400" />
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
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
    </>
  );
}
