"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addQuestion } from "@/lib/actions/quizzes";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const TYPES = [
  { type: "single", label: "+ Question unique", text: "Nouvelle question" },
  { type: "multiple", label: "+ Question à choix multiples", text: "Nouvelle question" },
  { type: "true_false", label: "+ Vrai / Faux", text: "Nouvelle affirmation" },
] as const;

export function AddQuestionButtons({ quizId }: { quizId: string }) {
  const [pending, startTransition] = useTransition();
  const [pendingType, setPendingType] = useState<string | null>(null);

  function handleAdd(type: string, text: string) {
    const fd = new FormData();
    fd.set("quizId", quizId);
    fd.set("type", type);
    fd.set("text", text);
    fd.set("points", "1");
    setPendingType(type);
    startTransition(async () => {
      try {
        await addQuestion(fd);
        toast.success("Question ajoutée");
      } catch {
        toast.error("Erreur lors de l'ajout de la question");
      } finally {
        setPendingType(null);
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
          {pendingType === type ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : null}
          {label}
        </Button>
      ))}
    </div>
  );
}
