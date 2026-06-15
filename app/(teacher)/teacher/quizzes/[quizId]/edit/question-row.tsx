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
  return (
    <div className="space-y-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Q{index + 1}</span>
          <Badge variant="outline">{TYPE_LABEL[question.type]}</Badge>
        </div>
        <form action={deleteQuestion}>
          <input type="hidden" name="id" value={question.id} />
          <input type="hidden" name="quizId" value={quizId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-red-600"
          >
            Supprimer la question
          </Button>
        </form>
      </div>

      <form
        action={updateQuestion}
        className="grid gap-3 sm:grid-cols-[1fr_120px_120px]"
      >
        <input type="hidden" name="id" value={question.id} />
        <input type="hidden" name="quizId" value={quizId} />
        <input type="hidden" name="type" value={question.type} />
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
          <Button type="submit" variant="outline" size="sm" className="w-full">
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
                <form className="flex items-center gap-2">
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="questionId" value={question.id} />
                  <input type="hidden" name="quizId" value={quizId} />
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
                    formAction={updateOption}
                    variant="ghost"
                    size="sm"
                  >
                    OK
                  </Button>
                  {question.type !== "true_false" ? (
                    <Button
                      type="submit"
                      formAction={deleteOption}
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
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
          <form action={addOption}>
            <input type="hidden" name="questionId" value={question.id} />
            <input type="hidden" name="quizId" value={quizId} />
            <Button type="submit" variant="outline" size="sm">
              + Ajouter une option
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
