"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  addOption,
  deleteOption,
  deleteQuestion,
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
}: {
  quizId: string;
  question: Question;
  options: Option[];
  index: number;
}) {
  const [pending, startTransition] = useTransition();

  function run(
    action: (fd: FormData) => Promise<void>,
    build: (fd: FormData) => void,
    successMsg: string,
    errorMsg: string,
  ) {
    const fd = new FormData();
    build(fd);
    startTransition(async () => {
      try {
        await action(fd);
        toast.success(successMsg);
      } catch {
        toast.error(errorMsg);
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
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
                    OK
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
                      ×
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
            + Ajouter une option
          </Button>
        ) : null}
      </div>
    </div>
  );
}
