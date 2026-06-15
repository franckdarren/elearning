/**
 * Lightweight unit tests for pure helpers.
 * Run with: npm run test:unit
 *
 * No vitest / jest dependency — exits 0 on success, 1 on failure.
 */
import { scoreQuiz } from "../lib/quiz-scoring";

let passed = 0;
let failed = 0;

function eq(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  [PASS] ${label}`);
  } else {
    failed++;
    console.log(`  [FAIL] ${label}`);
    console.log(`    expected: ${e}`);
    console.log(`    actual:   ${a}`);
  }
}

// -----------------------------------------------------------------------
// scoreQuiz
// -----------------------------------------------------------------------
const Q_SINGLE = {
  id: "q1",
  points: 1,
  options: [
    { id: "a", isCorrect: true },
    { id: "b", isCorrect: false },
  ],
};

const Q_MULTI = {
  id: "q2",
  points: 2,
  options: [
    { id: "a", isCorrect: true },
    { id: "b", isCorrect: true },
    { id: "c", isCorrect: false },
  ],
};

console.log("scoreQuiz");

eq(
  "single — correct pick",
  scoreQuiz([Q_SINGLE], [{ questionId: "q1", selectedOptionIds: ["a"] }]).score,
  1,
);

eq(
  "single — wrong pick",
  scoreQuiz([Q_SINGLE], [{ questionId: "q1", selectedOptionIds: ["b"] }]).score,
  0,
);

eq(
  "single — no pick",
  scoreQuiz([Q_SINGLE], [{ questionId: "q1", selectedOptionIds: [] }]).score,
  0,
);

eq(
  "multi — both correct picked",
  scoreQuiz([Q_MULTI], [{ questionId: "q2", selectedOptionIds: ["a", "b"] }])
    .score,
  2,
);

eq(
  "multi — only one correct (no partial credit)",
  scoreQuiz([Q_MULTI], [{ questionId: "q2", selectedOptionIds: ["a"] }]).score,
  0,
);

eq(
  "multi — correct + incorrect picked",
  scoreQuiz(
    [Q_MULTI],
    [{ questionId: "q2", selectedOptionIds: ["a", "b", "c"] }],
  ).score,
  0,
);

eq(
  "multi — junk option IDs are ignored",
  scoreQuiz(
    [Q_MULTI],
    [{ questionId: "q2", selectedOptionIds: ["a", "b", "ghost"] }],
  ).score,
  2,
);

eq(
  "max score = sum of question points",
  scoreQuiz([Q_SINGLE, Q_MULTI], []).maxScore,
  3,
);

eq(
  "missing answer counts as 0",
  scoreQuiz([Q_SINGLE, Q_MULTI], [{ questionId: "q1", selectedOptionIds: ["a"] }]),
  {
    score: 1,
    maxScore: 3,
    questions: [
      {
        questionId: "q1",
        awardedPoints: 1,
        maxPoints: 1,
        correctOptionIds: ["a"],
        selectedOptionIds: ["a"],
      },
      {
        questionId: "q2",
        awardedPoints: 0,
        maxPoints: 2,
        correctOptionIds: ["a", "b"],
        selectedOptionIds: [],
      },
    ],
  },
);

console.log(`\n${passed}/${passed + failed} tests passed.`);
process.exit(failed === 0 ? 0 : 1);
