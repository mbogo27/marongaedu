"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setLessonCompleteAction } from "@/lib/actions/learn";

export default function LessonFooter({
  slug,
  lessonId,
  completed,
  prevId,
  nextId,
  nextLocked,
  hideMarkComplete,
}: {
  slug: string;
  lessonId: string;
  completed: boolean;
  prevId?: string;
  nextId?: string;
  /** Sequential course: the next lesson stays locked until this one is complete. */
  nextLocked?: boolean;
  hideMarkComplete?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nav = "rounded-full border px-4 py-2 text-sm font-medium";
  const enabled = "border-teal-200 text-ink/80 hover:bg-teal-50";
  const disabled = "pointer-events-none border-teal-50 text-ink/40";

  return (
    <div className="border-t border-teal-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={prevId ? `/learn/${slug}?lesson=${prevId}` : "#"}
          aria-disabled={!prevId}
          tabIndex={prevId ? 0 : -1}
          className={`${nav} ${prevId ? enabled : disabled}`}
        >
          ← Previous
        </Link>

        {!hideMarkComplete && (
          <button
            type="button"
            disabled={pending}
            aria-pressed={completed}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                const res = await setLessonCompleteAction(lessonId, !completed);
                if (!res.ok) setError("Could not update this lesson.");
                router.refresh();
              })
            }
            className={`rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-60 ${
              completed ? "border border-teal-300 text-teal-800 hover:bg-teal-50" : "bg-teal-700 text-white hover:bg-teal-800"
            }`}
          >
            {pending ? "Saving…" : completed ? "Completed ✓ (mark incomplete)" : "Mark as complete"}
          </button>
        )}

        {nextId && !nextLocked ? (
          <Link href={`/learn/${slug}?lesson=${nextId}`} className={`${nav} ${enabled}`}>
            Next →
          </Link>
        ) : (
          <span aria-disabled="true" className={`${nav} ${disabled}`}>
            Next →
          </span>
        )}
      </div>
      {nextId && nextLocked && <p className="mt-2 text-right text-xs text-ink/70">Complete this lesson to unlock the next one.</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
