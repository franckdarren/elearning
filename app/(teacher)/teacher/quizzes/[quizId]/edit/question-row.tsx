"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
  addOption,
  deleteOption,
  deleteQuestion,
  moveQuestion,
  updateOption,
  updateQuestion,
} from "@/lib/actions/quizzes";

const TYPE_LABEL = {
  single: "Choix unique",
  multiple: "Choix multiples",
  true_false: "Vrai / Faux",
} as const;

type Option = {
  id: string;
  text: string;
  isCorrect: boolean;
  position: number;
};

type Question = {
  id: string;
  type: "single" | "multiple" | "true_false";
  text: string;
  points: string | null;
  position: number;
};

export function QuestionRow({
  quizId,
  question,
  options,
  index,
  isFirst,
  isLast,
}: {
  quizId: string;
  question: Question;
  options: Option[];
  index: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  function run(
    action: (fd: FormData) => Promise<void>,
    build: (fd: FormData) => void,
    successMsg: string,
    errorMsg: string,
    actionKey: string,
  ) {
    const fd = new FormData();
    build(fd);
    setPendingAction(actionKey);
    startTransition(async () => {
      try {
        await action(fd);
        toast.success(successMsg);
      } catch {
        toast.error(errorMsg);
      } finally {
        setPendingAction(null);
      }
    });
  }

  function handleUpdateQuestion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = new FormData(e.currentTarget);
    run(
      updateQuestion,
      (fd) => {
        fd.set("id", question.id);
        fd.set("quizId", quizId);
        fd.set("type", question.type);
        fd.set("text", raw.get("text") as string);
        fd.set("points", raw.get("points") as string);
      },
      "Question enregistrée",
      "Erreur lors de l'enregistrement",
      "save-question",
    );
  }

  function handleDeleteQuestion() {
    run(
      deleteQuestion,
      (fd) => {
        fd.set("id", question.id);
        fd.set("quizId", quizId);
      },
      "Question supprimée",
      "Erreur lors de la suppression",
      "delete-question",
    );
  }

  function handleMove(direction: "up" | "down") {
    run(
      moveQuestion,
      (fd) => {
        fd.set("id", question.id);
        fd.set("quizId", quizId);
        fd.set("direction", direction);
      },
      direction === "up" ? "Question déplacée vers le haut" : "Question déplacée vers le bas",
      "Erreur lors du déplacement",
      `move-${direction}`,
    );
  }

  function handleUpdateOption(e: React.FormEvent<HTMLFormElement>, optionId: string) {
    e.preventDefault();
    const raw = new FormData(e.currentTarget);
    run(
      updateOption,
      (fd) => {
        fd.set("id", optionId);
        fd.set("questionId", question.id);
        fd.set("quizId", quizId);
        fd.set("text", raw.get("text") as string);
        fd.set("isCorrect", raw.get("isCorrect") === "true" ? "true" : "false");
      },
      "Option enregistrée",
      "Erreur lors de l'enregistrement de l'option",
      `update-option-${optionId}`,
    );
  }

  function handleDeleteOption(optionId: string) {
    run(
      deleteOption,
      (fd) => {
        fd.set("id", optionId);
        fd.set("quizId", quizId);
      },
      "Option supprimée",
      "Erreur lors de la suppression de l'option",
      `delete-option-${optionId}`,
    );
  }

  function handleAddOption() {
    run(
      addOption,
      (fd) => {
        fd.set("questionId", question.id);
        fd.set("quizId", quizId);
      },
      "Option ajoutée",
      "Erreur lors de l'ajout de l'option",
      "add-option",
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={pending || isFirst}
              onClick={() => handleMove("up")}
              aria-label="Déplacer vers le haut"
            >
              {pendingAction === "move-up" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={pending || isLast}
              onClick={() => handleMove("down")}
              aria-label="Déplacer vers le bas"
            >
              {pendingAction === "move-down" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
          <span className="text-sm font-semibold">Q{index + 1}</span>
          <Badge variant="outline">{TYPE_LABEL[question.type]}</Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-600"
          disabled={pending}
          onClick={handleDeleteQuestion}
        >
          {pendingAction === "delete-question" ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : null}
          Supprimer la question
        </Button>
      </div>

      <form
        onSubmit={handleUpdateQuestion}
        className="grid gap-3 sm:grid-cols-[1fr_120px_120px]"
      >
        <div className="space-y-1">
          <Label htmlFor={`q-${question.id}-text`} className="text-xs">
            Énoncé
          </Label>
          <Input
            id={`q-${question.id}-text`}
            name="text"
            defaultValue={question.text}
            maxLength={2000}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`q-${question.id}-points`} className="text-xs">
            Points
          </Label>
          <Input
            id={`q-${question.id}-points`}
            name="points"
            type="number"
            min={0}
            step="0.5"
            defaultValue={question.points ?? "1"}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="outline" size="sm" className="w-full" disabled={pending}>
            {pendingAction === "save-question" ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : null}
            Enregistrer
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <div className="text-xs font-medium text-zinc-500">Options</div>
        {options.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucune option.</p>
        ) : (
          <ul className="space-y-2">
            {options.map((o) => (
              <li key={o.id}>
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => handleUpdateOption(e, o.id)}
                >
                  <label className="flex items-center gap-1 text-xs text-zinc-600">
                    <input
                      type="checkbox"
                      name="isCorrect"
                      value="true"
                      defaultChecked={o.isCorrect}
                      className="h-4 w-4"
                    />
                    correct
                  </label>
                  <Input
                    name="text"
                    defaultValue={o.text}
                    maxLength={500}
                    className="flex-1"
                    disabled={question.type === "true_false"}
                  />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                  >
                    {pendingAction === `update-option-${o.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "OK"
                    )}
                  </Button>
                  {question.type !== "true_false" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      disabled={pending}
                      onClick={() => handleDeleteOption(o.id)}
                    >
                      {pendingAction === `delete-option-${o.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "×"
                      )}
                    </Button>
                  ) : null}
                </form>
              </li>
            ))}
          </ul>
        )}
        {question.type !== "true_false" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={handleAddOption}
          >
            {pendingAction === "add-option" ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : null}
            + Ajouter une option
          </Button>
        ) : null}
      </div>
    </div>
  );
}
