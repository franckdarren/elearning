import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/permissions";
import { loadQuizForPlay } from "@/lib/actions/student-quiz";
import { Card, CardContent } from "@/components/ui/card";
import { QuizPlayer } from "@/components/student/quiz-player";

export const metadata = { title: "Élève · Quiz" };
export const dynamic = "force-dynamic";

export default async function StudentQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  await requireRole("student");
  const { quizId } = await params;

  const result = await loadQuizForPlay(quizId);
  if (!result.ok) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Quiz indisponible</h1>
        <Card>
          <CardContent className="p-6 text-sm text-zinc-500">
            {result.error}
          </CardContent>
        </Card>
      </div>
    );
  }
  if (result.questions.length === 0) {
    notFound();
  }

  return (
    <QuizPlayer
      quizId={result.id}
      title={result.title}
      description={result.description}
      durationMinutes={result.durationMinutes}
      questions={result.questions}
    />
  );
}
