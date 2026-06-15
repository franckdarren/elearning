"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { upsertQuiz, type ActionState } from "@/lib/actions/quizzes";
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

function toLocalInput(d: Date | string | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Assignment = {
  classId: string;
  subjectId: string;
  className: string;
  subjectName: string;
};

type Chapter = { id: string; title: string; classId: string; subjectId: string };

type Props = {
  trigger: React.ReactNode;
  assignments: Assignment[];
  chapters: Chapter[];
  quiz?: {
    id: string;
    classId: string;
    subjectId: string;
    chapterId: string | null;
    title: string;
    description: string | null;
    durationMinutes: number | null;
    maxAttempts: number | null;
    opensAt: Date | string | null;
    closesAt: Date | string | null;
    status: "draft" | "scheduled" | "published" | "archived";
  };
};

export function QuizDialog({ trigger, assignments, chapters, quiz }: Props) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<string>(
    quiz ? `${quiz.classId}:${quiz.subjectId}` : "",
  );
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    upsertQuiz,
    null,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setOpen(false);
    }
  }, [state]);

  const [classId, subjectId] = scope ? scope.split(":") : ["", ""];
  const filteredChapters = chapters.filter(
    (c) => c.classId === classId && c.subjectId === subjectId,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{quiz ? "Modifier le quiz" : "Nouveau quiz"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {quiz ? <input type="hidden" name="id" value={quiz.id} /> : null}
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="subjectId" value={subjectId} />

          <div className="space-y-2">
            <Label>Périmètre</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner classe + matière" />
              </SelectTrigger>
              <SelectContent>
                {assignments.map((a) => (
                  <SelectItem
                    key={`${a.classId}:${a.subjectId}`}
                    value={`${a.classId}:${a.subjectId}`}
                  >
                    {a.className} — {a.subjectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              defaultValue={quiz?.title ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              maxLength={2000}
              defaultValue={quiz?.description ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="chapterId">Chapitre associé (optionnel)</Label>
            <Select
              name="chapterId"
              defaultValue={quiz?.chapterId ?? ""}
              disabled={!scope}
            >
              <SelectTrigger id="chapterId">
                <SelectValue placeholder="(Aucun)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">(Aucun)</SelectItem>
                {filteredChapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Durée (min)</Label>
              <Input
                id="durationMinutes"
                name="durationMinutes"
                type="number"
                min={0}
                defaultValue={quiz?.durationMinutes ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxAttempts">Tentatives</Label>
              <Input
                id="maxAttempts"
                name="maxAttempts"
                type="number"
                min={1}
                defaultValue={quiz?.maxAttempts ?? 1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="opensAt">Ouverture</Label>
              <Input
                id="opensAt"
                name="opensAt"
                type="datetime-local"
                defaultValue={toLocalInput(quiz?.opensAt ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closesAt">Fermeture</Label>
              <Input
                id="closesAt"
                name="closesAt"
                type="datetime-local"
                defaultValue={toLocalInput(quiz?.closesAt ?? null)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Statut</Label>
            <Select name="status" defaultValue={quiz?.status ?? "draft"}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="scheduled">Programmé</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={pending || !scope}>
              {pending ? "…" : quiz ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
