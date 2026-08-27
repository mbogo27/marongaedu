"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markLessonCompleteAction } from "@/lib/actions/learn";

export default function LessonFooter({
  slug,
  lessonId,
  completed,
  prevId,
  nextId,
  hideMarkComplete,
}: {
  slug: string;
  lessonId: string;
  completed: boolean;
  prevId?: string;
  nextId?: string;
  hideMarkComplete?: boolean;
}) {
  const [isDone, setIsDone] = useState(completed);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between border-t border-teal-100 pt-4">
      <Link
        href={prevId ? `/learn/${slug}?lesson=${prevId}` : "#"}
        aria-disabled={!prevId}
        className={`rounded-full border px-4 py-2 text-sm font-medium ${
          prevId ? "border-teal-100 text-ink/70 hover:bg-teal-50" : "pointer-events-none border-teal-50 text-ink/30"
        }`}
      >
        ← Previous
      </Link>

      {!hideMarkComplete && (
        <button
          type="button"
          disabled={isDone || pending}
          onClick={() =>
            startTransition(async () => {
              await markLessonCompleteAction(slug, lessonId);
              setIsDone(true);
            })
          }
          className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
        >
          {isDone ? "Completed ✓" : pending ? "Saving…" : "Mark as complete"}
        </button>
      )}

      <Link
        href={nextId ? `/learn/${slug}?lesson=${nextId}` : "#"}
        aria-disabled={!nextId}
        className={`rounded-full border px-4 py-2 text-sm font-medium ${
          nextId ? "border-teal-100 text-ink/70 hover:bg-teal-50" : "pointer-events-none border-teal-50 text-ink/30"
        }`}
      >
        Next →
      </Link>
    </div>
  );
}
