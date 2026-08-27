"use client";

import { useState } from "react";
import { submitQuizAction, type QuizSubmission } from "@/lib/actions/learn";
import LessonFooter from "./LessonFooter";

type Option = { id: string; text: string };
type Question = { id: string; question: string; type: string; explanation: string | null; options: Option[] };

export default function QuizLessonPane({
  slug,
  lessonId,
  title,
  instructions,
  questions,
  alreadyCompleted,
  prevId,
  nextId,
}: {
  slug: string;
  lessonId: string;
  title: string;
  instructions?: string;
  questions: Question[];
  alreadyCompleted: boolean;
  prevId?: string;
  nextId?: string;
}) {
  const [answers, setAnswers] = useState<QuizSubmission>({});
  const [result, setResult] = useState<{ scorePercent: number; passed: boolean; results: Record<string, boolean> } | null>(
    alreadyCompleted ? { scorePercent: 100, passed: true, results: {} } : null
  );
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(alreadyCompleted);

  function selectSingle(questionId: string, optionId: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: [optionId] }));
  }

  function toggleMulti(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const current = new Set(prev[questionId] ?? []);
      if (current.has(optionId)) current.delete(optionId);
      else current.add(optionId);
      return { ...prev, [questionId]: [...current] };
    });
  }

  async function submit() {
    setSubmitting(true);
    const outcome = await submitQuizAction(slug, lessonId, answers);
    setResult(outcome);
    setShowResults(true);
    setSubmitting(false);
  }

  const allAnswered = questions.every((q) => (answers[q.id]?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-teal-900">{title}</h1>
      {instructions && <p className="text-sm text-ink/60">{instructions}</p>}

      {result && (
        <div className={`rounded-2xl px-5 py-4 text-sm font-medium ${result.passed ? "bg-teal-50 text-teal-700" : "bg-gold-50 text-gold-700"}`}>
          {result.passed
            ? `Passed with ${result.scorePercent}%! This lesson is marked complete.`
            : `You scored ${result.scorePercent}%. You need 70% to pass — try again.`}
        </div>
      )}

      <div className="space-y-5">
        {questions.map((q, qi) => (
          <div key={q.id} className="rounded-2xl border border-teal-100 bg-white p-5">
            <p className="font-medium text-ink">
              {qi + 1}. {q.question}
            </p>
            <div className="mt-3 space-y-2">
              {q.options.map((opt) => {
                const selected = (answers[q.id] ?? []).includes(opt.id);
                const isMulti = q.type === "MULTI";
                return (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      selected ? "border-teal-400 bg-teal-50" : "border-teal-100 hover:bg-teal-50/50"
                    }`}
                  >
                    <input
                      type={isMulti ? "checkbox" : "radio"}
                      name={q.id}
                      checked={selected}
                      disabled={!!result?.passed}
                      onChange={() => (isMulti ? toggleMulti(q.id, opt.id) : selectSingle(q.id, opt.id))}
                      className="h-4 w-4"
                    />
                    {opt.text}
                  </label>
                );
              })}
            </div>
            {showResults && result?.results[q.id] !== undefined && (
              <p className={`mt-3 text-sm ${result.results[q.id] ? "text-teal-700" : "text-red-600"}`}>
                {result.results[q.id] ? "Correct" : "Incorrect"}
                {q.explanation && ` — ${q.explanation}`}
              </p>
            )}
          </div>
        ))}
      </div>

      {!showResults || !result?.passed ? (
        <button
          type="button"
          onClick={submit}
          disabled={!allAnswered || submitting}
          className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : showResults ? "Try again" : "Submit answers"}
        </button>
      ) : null}

      <LessonFooter slug={slug} lessonId={lessonId} completed={!!result?.passed} prevId={prevId} nextId={nextId} hideMarkComplete />
    </div>
  );
}
