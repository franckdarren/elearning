"use client";

import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { getDocumentSignedUploadUrl } from "@/lib/actions/upload-urls";
import { createDocumentResourceRecord } from "@/lib/actions/resources";
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

const MAX_DOC_MB = 50;

async function uploadToSignedUrl(
  signedUrl: string,
  file: File,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) return { ok: false, error: `Erreur HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function DocumentUploadDialog({
  chapterId,
  sequences,
}: {
  chapterId: string;
  sequences: Sequence[];
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function resetState() {
    setStatus("idle");
    setError(null);
    formRef.current?.reset();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      setError("Veuillez sélectionner un fichier.");
      return;
    }
    if (file.size > MAX_DOC_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${MAX_DOC_MB} MB).`);
      return;
    }

    setError(null);
    setStatus("uploading");

    // 1. Obtenir l'URL signée
    const urlResult = await getDocumentSignedUploadUrl(chapterId, file.name);
    if (!urlResult.ok) {
      setError(urlResult.error);
      setStatus("idle");
      return;
    }

    // 2. Upload direct vers Supabase Storage
    const upload = await uploadToSignedUrl(urlResult.signedUrl, file);
    if (!upload.ok) {
      setError(`Échec du téléversement : ${upload.error}`);
      setStatus("idle");
      return;
    }

    // 3. Enregistrer en base
    setStatus("saving");
    formData.set("documentPath", urlResult.path);
    formData.delete("file");

    const result = await createDocumentResourceRecord(formData);

    if (result?.error) {
      setError(result.error);
      setStatus("idle");
      return;
    }

    toast.success("Document enregistré");
    setOpen(false);
    resetState();
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetState();
    setOpen(next);
  }

  const busy = status !== "idle";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Nouveau document</Button>
      </DialogTrigger>
      <DialogContent
        className="flex flex-col gap-0 p-0 sm:max-w-lg max-h-[90vh] overflow-hidden"
        aria-describedby={undefined}
      >
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle>Ajouter un document</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
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

            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input id="title" name="title" required maxLength={200} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" maxLength={2000} />
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
              <Label htmlFor="file">Fichier</Label>
              <FileInput
                id="file"
                name="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
                required
                variant="document"
                hint={`PDF, DOCX, PPTX… max ${MAX_DOC_MB} Mo`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentAccess">Accès</Label>
              <Select name="documentAccess" defaultValue="view_only">
                <SelectTrigger id="documentAccess">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view_only">Lecture seule</SelectItem>
                  <SelectItem value="downloadable">Téléchargeable</SelectItem>
                </SelectContent>
              </Select>
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
                ? "Téléversement…"
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
