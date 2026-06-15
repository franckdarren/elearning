"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  submitQuizAttempt,
  type QuestionForPlay,
  type SubmitResult,
} from "@/lib/actions/student-quiz";

type Props = {
  quizId: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  questions: QuestionForPlay[];
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function QuizPlayer({
  quizId,
  title,
  description,
  durationMinutes,
  questions,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [remaining, setRemaining] = useState<number | null>(
    durationMinutes ? durationMinutes * 60 : null,
  );

  // Timer ticker (auto-submit at 0).
  useEffect(() => {
    if (remaining == null || result) return;
    if (remaining <= 0) {
      submit();
      return;
    }
    const id = window.setTimeout(() => setRemaining((r) => (r ?? 0) - 1), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, result]);

  function toggle(
    questionId: string,
    optionId: string,
    type: "single" | "multiple" | "true_false",
  ) {
    setAnswers((prev) => {
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

  function submit() {
    if (result || pending) return;
    const payload = questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: answers[q.id] ?? [],
    }));
    startTransition(async () => {
      const res = await submitQuizAttempt(quizId, payload);
      setResult(res);
    });
  }

  const correctedByQ = useMemo(() => {
    if (!result || !result.ok) return new Map();
    return new Map(result.questions.map((c) => [c.questionId, c]));
  }, [result]);

  if (result?.ok) {
    const pct =
      result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Résultats</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {result.score} / {result.maxScore}{" "}
              <span className="text-base font-normal text-zinc-500">
                ({pct} %)
              </span>
            </p>
          </CardContent>
        </Card>

        {questions.map((q, idx) => {
          const c = correctedByQ.get(q.id);
          return (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  Q{idx + 1}. {q.text}
                </CardTitle>
                <p className="text-xs text-zinc-500">
                  {c?.awardedPoints ?? 0} / {c?.maxPoints ?? q.points} pts
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {q.options.map((o) => {
                    const isCorrect = c?.correctOptionIds.includes(o.id);
                    const isSelected = c?.selectedOptionIds.includes(o.id);
                    return (
                      <li
                        key={o.id}
                        className={
                          isCorrect
                            ? "rounded border border-emerald-300 bg-emerald-50 px-2 py-1 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                            : isSelected
                              ? "rounded border border-red-300 bg-red-50 px-2 py-1 dark:border-red-900/60 dark:bg-red-950/30"
                              : "px-2 py-1"
                        }
                      >
                        <span className="mr-2 text-xs text-zinc-500">
                          {isSelected ? "→" : "  "}
                        </span>
                        {o.text}
                        {isCorrect ? (
                          <Badge variant="default" className="ml-2">
                            Correct
                          </Badge>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-sm text-zinc-500">{description}</p>
          ) : null}
        </div>
        {remaining != null ? (
          <Badge variant={remaining < 60 ? "destructive" : "secondary"}>
            ⏱ {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
          </Badge>
        ) : null}
      </div>

      {result && !result.ok ? (
        <Card>
          <CardContent className="p-4 text-sm text-red-600">
            {result.error}
          </CardContent>
        </Card>
      ) : null}

      {questions.map((q, idx) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle className="text-base">
              Q{idx + 1}. {q.text}{" "}
              <span className="text-xs font-normal text-zinc-500">
                ({q.points} pts)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {q.options.map((o) => {
                const selected = (answers[q.id] ?? []).includes(o.id);
                const inputType = q.type === "multiple" ? "checkbox" : "radio";
                return (
                  <li key={o.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <input
                        type={inputType}
                        name={q.id}
                        checked={selected}
                        onChange={() => toggle(q.id, o.id, q.type)}
                        className="h-4 w-4"
                      />
                      {o.text}
                    </label>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ))}

      <Button onClick={submit} disabled={pending} className="w-full sm:w-auto">
        {pending ? "Envoi…" : "Soumettre"}
      </Button>
    </div>
  );
}
