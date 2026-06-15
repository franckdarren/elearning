import { Button } from "@/components/ui/button";
import { addQuestion } from "@/lib/actions/quizzes";

export function AddQuestionButtons({ quizId }: { quizId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={addQuestion}>
        <input type="hidden" name="quizId" value={quizId} />
        <input type="hidden" name="type" value="single" />
        <input type="hidden" name="text" value="Nouvelle question" />
        <input type="hidden" name="points" value="1" />
        <Button type="submit" variant="outline" size="sm">
          + Question unique
        </Button>
      </form>
      <form action={addQuestion}>
        <input type="hidden" name="quizId" value={quizId} />
        <input type="hidden" name="type" value="multiple" />
        <input type="hidden" name="text" value="Nouvelle question" />
        <input type="hidden" name="points" value="1" />
        <Button type="submit" variant="outline" size="sm">
          + Question à choix multiples
        </Button>
      </form>
      <form action={addQuestion}>
        <input type="hidden" name="quizId" value={quizId} />
        <input type="hidden" name="type" value="true_false" />
        <input type="hidden" name="text" value="Nouvelle affirmation" />
        <input type="hidden" name="points" value="1" />
        <Button type="submit" variant="outline" size="sm">
          + Vrai / Faux
        </Button>
      </form>
    </div>
  );
}
