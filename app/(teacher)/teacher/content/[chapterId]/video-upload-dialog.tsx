"use client";

import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getVideoSignedUploadUrl,
  getThumbnailSignedUploadUrl,
} from "@/lib/actions/upload-urls";
import { createVideoResourceRecord } from "@/lib/actions/resources";
import { FileInput } from "@/components/shared/file-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Sequence = { id: string; title: string };

const MAX_VIDEO_MB = 100;
const MAX_THUMB_MB = 5;

function uploadWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.timeout = 10 * 60 * 1000; // 10 min
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve({ ok: true })
        : resolve({ ok: false, error: `Erreur HTTP ${xhr.status}` });
    xhr.onerror = () => resolve({ ok: false, error: "Erreur réseau" });
    xhr.ontimeout = () => resolve({ ok: false, error: "Délai dépassé (10 min)" });
    xhr.send(file);
  });
}

export function VideoUploadDialog({
  chapterId,
  sequences,
}: {
  chapterId: string;
  sequences: Sequence[];
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function resetState() {
    setStatus("idle");
    setProgress(0);
    setError(null);
    formRef.current?.reset();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      setError("Veuillez sélectionner un fichier vidéo.");
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${MAX_VIDEO_MB} Mo).`);
      return;
    }

    const thumb = formData.get("thumbnail") as File | null;
    if (thumb && thumb.size > MAX_THUMB_MB * 1024 * 1024) {
      setError(`Miniature trop volumineuse (max ${MAX_THUMB_MB} Mo).`);
      return;
    }

    setError(null);
    setStatus("uploading");
    setProgress(0);

    try {
      // 1. URL signée pour la vidéo
      const videoUrlResult = await getVideoSignedUploadUrl(chapterId, file.name);
      if (!videoUrlResult.ok) {
        setError(videoUrlResult.error);
        return;
      }

      // 2. Upload direct vers Supabase Storage avec progression
      const videoUpload = await uploadWithProgress(
        videoUrlResult.signedUrl,
        file,
        setProgress,
      );
      if (!videoUpload.ok) {
        setError(`Échec du téléversement : ${videoUpload.error}`);
        return;
      }

      // 3. Upload miniature si présente
      let thumbnailPath: string | null = null;
      if (thumb && thumb.size > 0) {
        const thumbUrlResult = await getThumbnailSignedUploadUrl(chapterId, thumb.name);
        if (thumbUrlResult.ok) {
          const thumbUpload = await uploadWithProgress(
            thumbUrlResult.signedUrl,
            thumb,
            () => {},
          );
          if (thumbUpload.ok) thumbnailPath = thumbUrlResult.path;
        }
      }

      // 4. Enregistrer en base
      setStatus("saving");
      formData.set("videoPath", videoUrlResult.path);
      if (thumbnailPath) formData.set("thumbnailPath", thumbnailPath);
      formData.delete("file");
      formData.delete("thumbnail");

      const result = await createVideoResourceRecord(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      toast.success("Vidéo enregistrée");
      setOpen(false);
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue s'est produite");
    } finally {
      // Remet idle si une erreur a empêché resetState() d'être appelé
      setStatus((prev) => (prev !== "idle" ? "idle" : prev));
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    setOpen(next);
  }

  const busy = status !== "idle";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Nouvelle vidéo</Button>
      </DialogTrigger>

      {/* Layout : header fixe + corps scrollable + footer fixe — évite le débordement horizontal */}
      <DialogContent
        className="flex flex-col gap-0 p-0 sm:max-w-lg max-h-[90vh] overflow-hidden"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle>Ajouter une vidéo</DialogTitle>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <input type="hidden" name="chapterId" value={chapterId} />

            {error ? (
              <p
                className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            {status === "uploading" && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Téléversement en cours…</span>
                  <span>{progress} %</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-primary/20">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input id="title" name="title" required maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" maxLength={2000} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="durationSeconds">Durée (secondes)</Label>
                <Input
                  id="durationSeconds"
                  name="durationSeconds"
                  type="number"
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author">Auteur</Label>
                <Input id="author" name="author" maxLength={120} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sequenceId">Séquence (optionnel)</Label>
              <Select name="sequenceId" defaultValue="none">
                <SelectTrigger id="sequenceId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Directement dans le chapitre</SelectItem>
                  {sequences.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Fichier vidéo</Label>
              <FileInput
                id="file"
                name="file"
                accept="video/*"
                required
                variant="video"
                hint={`MP4, MOV, WebM… max ${MAX_VIDEO_MB} Mo`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail">Miniature (optionnel)</Label>
              <FileInput
                id="thumbnail"
                name="thumbnail"
                accept="image/*"
                variant="image"
                hint={`PNG, JPG, WebP… max ${MAX_THUMB_MB} Mo`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select name="status" defaultValue="draft">
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="scheduled">Programmé</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unpublishAt">Retrait</Label>
                <Input
                  id="unpublishAt"
                  name="unpublishAt"
                  type="datetime-local"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 shrink-0 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={busy}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={busy}>
              {status === "uploading"
                ? `Téléversement… ${progress} %`
                : status === "saving"
                  ? "Enregistrement…"
                  : "Téléverser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
