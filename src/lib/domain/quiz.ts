/** Server-side quiz grading (spec §5.3). Correct answers never leave the server before submission. */

export type GradableQuestion = {
  id: string;
  explanation: string | null;
  options: { id: string; isCorrect: boolean }[];
};

export type QuestionResult = {
  questionId: string;
  correct: boolean;
  correctOptionIds: string[];
  explanation: string | null;
};

export type QuizResult = {
  scorePercent: number;
  passed: boolean;
  correctCount: number;
  total: number;
  results: QuestionResult[];
};

/** answers: questionId → selected option ids. A question is correct iff the selected set equals the correct set. */
export function gradeQuiz(
  questions: GradableQuestion[],
  answers: Record<string, string[]>,
  passMark: number
): QuizResult {
  const results: QuestionResult[] = questions.map((q) => {
    const valid = new Set(q.options.map((o) => o.id));
    const correctIds = q.options.filter((o) => o.isCorrect).map((o) => o.id);
    // Ignore option ids that don't belong to this question.
    const selected = new Set((answers[q.id] ?? []).filter((id) => valid.has(id)));
    const correct = correctIds.length === selected.size && correctIds.every((id) => selected.has(id));
    return { questionId: q.id, correct, correctOptionIds: correctIds, explanation: q.explanation };
  });

  const correctCount = results.filter((r) => r.correct).length;
  const scorePercent = questions.length === 0 ? 100 : Math.round((correctCount / questions.length) * 100);
  return { scorePercent, passed: scorePercent >= passMark, correctCount, total: questions.length, results };
}
