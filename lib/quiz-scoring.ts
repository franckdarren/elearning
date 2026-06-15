/**
 * Pure scoring logic, extracted so it can be unit-tested without any
 * Supabase/DB plumbing.
 *
 * Rules:
 *   - Exact match scoring: full points iff the selected set equals the
 *     correct set (no extras, no missing).
 *   - Empty selections always score 0.
 */
export type ScoredQuestion = {
  questionId: string;
  awardedPoints: number;
  maxPoints: number;
  correctOptionIds: string[];
  selectedOptionIds: string[];
};

export type ScoringQuestion = {
  id: string;
  points: number;
  options: { id: string; isCorrect: boolean }[];
};

export type ScoringAnswer = {
  questionId: string;
  selectedOptionIds: string[];
};

export function scoreQuiz(
  questions: ScoringQuestion[],
  answers: ScoringAnswer[],
): { score: number; maxScore: number; questions: ScoredQuestion[] } {
  const byQ = new Map(answers.map((a) => [a.questionId, a.selectedOptionIds]));
  let score = 0;
  let maxScore = 0;
  const scored: ScoredQuestion[] = [];

  for (const q of questions) {
    maxScore += q.points;
    const allIds = new Set(q.options.map((o) => o.id));
    const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
    const correctSet = new Set(correctIds);

    const raw = byQ.get(q.id) ?? [];
    const selected = Array.from(new Set(raw.filter((id) => allIds.has(id))));

    const allCorrectPicked = correctIds.every((id) => selected.includes(id));
    const noIncorrectPicked = selected.every((id) => correctSet.has(id));
    const exactMatch =
      allCorrectPicked && noIncorrectPicked && selected.length > 0;

    const awarded = exactMatch ? q.points : 0;
    score += awarded;

    scored.push({
      questionId: q.id,
      awardedPoints: awarded,
      maxPoints: q.points,
      correctOptionIds: correctIds,
      selectedOptionIds: selected,
    });
  }
  return { score, maxScore, questions: scored };
}
