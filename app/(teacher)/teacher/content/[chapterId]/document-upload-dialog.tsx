"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  createDocumentResource,
  type ActionState,
} from "@/lib/actions/resources";
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

export function DocumentUploadDialog({
  chapterId,
  sequences,
}: {
  chapterId: string;
  sequences: Sequence[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createDocumentResource,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Nouveau document</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="chapterId" value={chapterId} />

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
            <Select name="sequenceId" defaultValue="">
              <SelectTrigger id="sequenceId">
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">(Directement dans le chapitre)</SelectItem>
                {sequences.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">Fichier (PDF, DOCX… max 50 MB)</Label>
            <Input id="file" name="file" type="file" required />
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

          {state?.error ? (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Envoi…" : "Téléverser"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
