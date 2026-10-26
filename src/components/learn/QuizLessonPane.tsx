"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitQuizAction, type QuizSubmission, type QuizOutcome } from "@/lib/actions/learn";
import LessonFooter from "./LessonFooter";
import type { LessonBody } from "@/lib/lesson-access";
import { FormMessage } from "@/components/ui/Field";

type QuizBody = Extract<LessonBody, { kind: "quiz" }>;
type Graded = Extract<QuizOutcome, { ok: true }>;

export default function QuizLessonPane({
  slug,
  lessonId,
  title,
  body,
  alreadyPassed,
  bestScore,
  prevId,
  nextId,
  nextLocked,
  canTrack,
}: {
  slug: string;
  lessonId: string;
  title: string;
  body: QuizBody;
  alreadyPassed: boolean;
  bestScore: number | null;
  prevId?: string;
  nextId?: string;
  nextLocked?: boolean;
  canTrack: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<QuizSubmission>({});
  const [graded, setGraded] = useState<Graded | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passed = alreadyPassed || !!graded?.passed;

  function select(q: QuizBody["questions"][number], optionId: string) {
    setAnswers((prev) => {
      if (q.type !== "MULTI") return { ...prev, [q.id]: [optionId] };
      const cur = new Set(prev[q.id] ?? []);
      if (cur.has(optionId)) cur.delete(optionId);
      else cur.add(optionId);
      return { ...prev, [q.id]: [...cur] };
    });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const outcome = await submitQuizAction(lessonId, answers);
    setSubmitting(false);
    if (!outcome.ok) return setError(outcome.error);
    setGraded(outcome);
    if (outcome.passed) router.refresh();
  }

  function retry() {
    setGraded(null);
    setAnswers({});
  }

  const allAnswered = body.questions.every((q) => (answers[q.id]?.length ?? 0) > 0);
  const resultFor = (qid: string) => graded?.results.find((r) => r.questionId === qid);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-teal-900">{title}</h1>
      <p className="text-sm text-ink/80">
        {body.instructions || "Answer every question."} You need {body.passMark}% to pass.
        {bestScore != null && ` Your best score: ${bestScore}%.`}
      </p>

      <div aria-live="polite">
        {graded && (
          <div
            role="status"
            className={`rounded-2xl px-5 py-4 text-sm font-medium ${graded.passed ? "bg-teal-50 text-teal-900" : "bg-gold-50 text-gold-900"}`}
          >
            {graded.passed
              ? `Passed with ${graded.scorePercent}%! This lesson is marked complete.`
              : `You scored ${graded.scorePercent}%. You need ${graded.passMark}% to pass — review the answers below and try again.`}
          </div>
        )}
        {!graded && alreadyPassed && (
          <p role="status" className="rounded-2xl bg-teal-50 px-5 py-4 text-sm font-medium text-teal-900">
            You have already passed this quiz. You can retake it any time.
          </p>
        )}
      </div>

      <ol className="space-y-5">
        {body.questions.map((q, qi) => {
          const r = resultFor(q.id);
          return (
            <li key={q.id}>
              <fieldset className="rounded-2xl border border-teal-100 bg-white p-5" disabled={!!graded}>
                <legend className="px-1 font-medium text-ink">
                  {qi + 1}. {q.question}
                  {q.type === "MULTI" && <span className="ml-2 text-xs font-normal text-ink/70">(select all that apply)</span>}
                </legend>
                <div className="mt-3 space-y-2">
                  {q.options.map((opt) => {
                    const selected = (answers[q.id] ?? []).includes(opt.id);
                    const isCorrect = r?.correctOptionIds.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          r
                            ? isCorrect
                              ? "border-teal-500 bg-teal-50"
                              : selected
                                ? "border-red-400 bg-red-50"
                                : "border-teal-100"
                            : selected
                              ? "border-teal-500 bg-teal-50"
                              : "border-teal-100 hover:bg-teal-50/50"
                        }`}
                      >
                        <input
                          type={q.type === "MULTI" ? "checkbox" : "radio"}
                          name={q.id}
                          checked={selected}
                          onChange={() => select(q, opt.id)}
                          className="h-4 w-4"
                        />
                        <span>{opt.text}</span>
                        {r && isCorrect && <span className="ml-auto text-xs font-semibold text-teal-900">Correct answer</span>}
                      </label>
                    );
                  })}
                </div>
                {r && (
                  <p className={`mt-3 text-sm ${r.correct ? "text-teal-900" : "text-red-800"}`}>
                    <strong>{r.correct ? "Correct." : "Incorrect."}</strong>
                    {r.explanation && ` ${r.explanation}`}
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <FormMessage error={error ?? undefined} />

      {graded ? (
        <button type="button" onClick={retry} className="rounded-full border border-teal-300 px-6 py-2.5 text-sm font-semibold text-teal-800 hover:bg-teal-50">
          {graded.passed ? "Retake quiz" : "Try again"}
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!allAnswered || submitting}
          className="rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit answers"}
        </button>
      )}

      <LessonFooter slug={slug} lessonId={lessonId} completed={passed} prevId={prevId} nextId={nextId} nextLocked={nextLocked && !passed} hideMarkComplete />
      {!canTrack && <p className="text-xs text-ink/70">Admin preview: your answers are graded but not recorded.</p>}
    </div>
  );
}
