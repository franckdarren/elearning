"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { addQuestion } from "@/lib/actions/quizzes";
import { Button } from "@/components/ui/button";

const TYPES = [
  { type: "single", label: "+ Question unique", text: "Nouvelle question" },
  { type: "multiple", label: "+ Question à choix multiples", text: "Nouvelle question" },
  { type: "true_false", label: "+ Vrai / Faux", text: "Nouvelle affirmation" },
] as const;

export function AddQuestionButtons({ quizId }: { quizId: string }) {
  const [pending, startTransition] = useTransition();

  function handleAdd(type: string, text: string) {
    const fd = new FormData();
    fd.set("quizId", quizId);
    fd.set("type", type);
    fd.set("text", text);
    fd.set("points", "1");
    startTransition(async () => {
      try {
        await addQuestion(fd);
        toast.success("Question ajoutée");
      } catch {
        toast.error("Erreur lors de l'ajout de la question");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {TYPES.map(({ type, label, text }) => (
        <Button
          key={type}
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => handleAdd(type, text)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
