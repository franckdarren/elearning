"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

const TYPE_LABEL = {
  single: "Choix unique",
  multiple: "Choix multiples",
  true_false: "Vrai / Faux",
} as const;

const STATUS_LABEL = {
  draft: "Brouillon",
  scheduled: "Programmé",
  published: "Publié",
  archived: "Archivé",
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
  options: Option[];
};

type Props = {
  title: string;
  description: string | null;
  durationMinutes: number | null;
  maxAttempts: number;
  status: "draft" | "scheduled" | "published" | "archived";
  questions: Question[];
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function QuizPreview({
  title,
  description,
  durationMinutes,
  maxAttempts,
  status,
  questions,
}: Props) {
  const [showAnswers, setShowAnswers] = useState(false);
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  function toggle(
    questionId: string,
    optionId: string,
    type: "single" | "multiple" | "true_false",
  ) {
    if (showAnswers) return;
    setSelected((prev) => {
      const current = prev[questionId] ?? [];
      if (type === "multiple") {
        return {
          ...prev,
          [questionId]: current.includes(optionId)
            ? current.filter((x) => x !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  }

  const totalPoints = questions.reduce(
    (acc, q) => acc + parseFloat(q.points ?? "1"),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Bandeau prévisualisation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
          <Eye className="h-4 w-4 shrink-0" />
          <span className="font-medium">Mode prévisualisation</span>
          <span className="text-amber-700/70 dark:text-amber-500/70">
            — les élèves voient ce quiz sans les réponses correctes
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-amber-300 bg-white text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:bg-transparent dark:text-amber-400"
          onClick={() => {
            setShowAnswers((v) => !v);
            setSelected({});
          }}
        >
          {showAnswers ? (
            <>
              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
              Masquer les réponses
            </>
          ) : (
            <>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Afficher les réponses
            </>
          )}
        </Button>
      </div>

      {/* En-tête du quiz */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-sm text-zinc-500">{description}</p>
          ) : null}
          <div className="flex flex-wrap gap-3 pt-1 text-xs text-zinc-500">
            <span>{questions.length} question{questions.length > 1 ? "s" : ""}</span>
            <span>{totalPoints} point{totalPoints > 1 ? "s" : ""} au total</span>
            {maxAttempts > 0 ? (
              <span>{maxAttempts} tentative{maxAttempts > 1 ? "s" : ""} max</span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === "published" ? "default" : "outline"}>
            {STATUS_LABEL[status]}
          </Badge>
          {durationMinutes ? (
            <Badge variant="secondary">
              ⏱ {pad(Math.floor(durationMinutes / 60))}:{pad(durationMinutes % 60)}
            </Badge>
          ) : null}
        </div>
      </div>

      {/* Questions */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-zinc-500">
            Aucune question dans ce quiz.
          </CardContent>
        </Card>
      ) : (
        questions.map((q, idx) => (
          <Card key={q.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">
                  Q{idx + 1}. {q.text}
                </CardTitle>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {TYPE_LABEL[q.type]}
                  </Badge>
                  <span className="text-xs text-zinc-500">
                    {q.points ?? "1"} pt{parseFloat(q.points ?? "1") > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {q.options.map((o) => {
                  const isSelected = (selected[q.id] ?? []).includes(o.id);
                  const inputType = q.type === "multiple" ? "checkbox" : "radio";

                  let optionClass =
                    "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900";

                  if (showAnswers && o.isCorrect) {
                    optionClass =
                      "flex items-center gap-2 rounded border border-emerald-300 bg-emerald-50 px-2 py-1.5 dark:border-emerald-900/60 dark:bg-emerald-950/30";
                  } else if (showAnswers) {
                    optionClass = "flex items-center gap-2 rounded px-2 py-1.5 text-zinc-500";
                  }

                  return (
                    <li key={o.id}>
                      <label className={optionClass}>
                        <input
                          type={inputType}
                          name={q.id}
                          checked={showAnswers ? o.isCorrect : isSelected}
                          readOnly={showAnswers}
                          onChange={() => !showAnswers && toggle(q.id, o.id, q.type)}
                          className="h-4 w-4 shrink-0"
                        />
                        <span>{o.text}</span>
                        {showAnswers && o.isCorrect ? (
                          <Badge variant="default" className="ml-auto text-xs">
                            Correct
                          </Badge>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>

              {showAnswers && !q.options.some((o) => o.isCorrect) ? (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ⚠ Aucune réponse correcte définie pour cette question.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}

      {/* Bouton soumettre (désactivé en preview) */}
      <Button disabled className="w-full sm:w-auto" title="Désactivé en mode prévisualisation">
        Soumettre
      </Button>
    </div>
  );
}
