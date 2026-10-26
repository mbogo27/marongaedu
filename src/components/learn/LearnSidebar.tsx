"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/format";

const TYPE_ICON: Record<string, string> = {
  VIDEO: "M8 5v14l11-7z",
  READING: "M4 4h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z",
  QUIZ: "M9 21h6M12 3a6 6 0 00-4 10.5c.5.5.8 1 .8 1.7V17h6.4v-1.8c0-.7.3-1.2.8-1.7A6 6 0 0012 3z",
  RESOURCE: "M16.5 6v11.5a4 4 0 01-8 0V5a2.5 2.5 0 015 0v10.5a1 1 0 01-2 0V6H10v9.5a2.5 2.5 0 005 0V5a4 4 0 00-8 0v12.5a5.5 5.5 0 0011 0V6h-1.5z",
};
const LOCK = "M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z";

export type SidebarLesson = { id: string; title: string; type: string; durationSeconds: number; completed: boolean; locked: boolean };
export type SidebarModule = { id: string; title: string; lessons: SidebarLesson[] };

export default function LearnSidebar({
  slug,
  modules,
  currentLessonId,
  progressPercent,
}: {
  slug: string;
  modules: SidebarModule[];
  currentLessonId: string;
  progressPercent: number;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const completedLessons = modules.reduce((s, m) => s + m.lessons.filter((l) => l.completed).length, 0);

  useEffect(() => {
    if (!mobileOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const body = (
    <>
      <div className="border-b border-teal-100 p-4">
        <p className="text-sm font-medium text-ink">
          {completedLessons} of {totalLessons} lessons complete
        </p>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-teal-50"
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Course progress"
        >
          <div className="h-full rounded-full bg-teal-700 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-1 text-xs text-ink/70">{progressPercent}% complete</p>
      </div>
      <nav aria-label="Course content" className="divide-y divide-teal-50">
        {modules.map((mod) => (
          <div key={mod.id}>
            <p className="bg-teal-50/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-teal-900">{mod.title}</p>
            <ul>
              {mod.lessons.map((lesson) => {
                const current = lesson.id === currentLessonId;
                const inner = (
                  <>
                    <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${current ? "fill-white" : lesson.completed ? "fill-teal-700" : "fill-ink/50"}`} aria-hidden="true">
                      <path d={lesson.completed ? "M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z" : lesson.locked ? LOCK : (TYPE_ICON[lesson.type] ?? TYPE_ICON.VIDEO)} />
                    </svg>
                    <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                    <span className="sr-only">
                      {lesson.completed ? " (completed)" : ""}
                      {lesson.locked ? " (locked)" : ""}
                    </span>
                    <span className={`shrink-0 text-xs ${current ? "text-white/90" : "text-ink/70"}`}>{formatDuration(lesson.durationSeconds)}</span>
                  </>
                );
                return (
                  <li key={lesson.id}>
                    {lesson.locked ? (
                      <span aria-disabled="true" className="flex cursor-not-allowed items-center gap-3 px-4 py-2.5 text-sm text-ink/70">
                        {inner}
                      </span>
                    ) : (
                      <Link
                        href={`/learn/${slug}?lesson=${lesson.id}`}
                        aria-current={current ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${current ? "bg-teal-700 text-white" : "text-ink/80 hover:bg-teal-50"}`}
                      >
                        {inner}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <>
      <div className="border-b border-teal-100 p-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-haspopup="dialog"
          className="rounded-full border border-teal-300 px-4 py-2 text-sm font-medium text-teal-800"
        >
          Course content · {progressPercent}%
        </button>
      </div>
      <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-teal-100 bg-white lg:block">{body}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Course content">
          <div className="w-80 max-w-[85vw] overflow-y-auto bg-white">
            <div className="flex items-center justify-between border-b border-teal-100 p-4">
              <p className="font-serif text-teal-900">Course content</p>
              <button ref={closeRef} type="button" onClick={() => setMobileOpen(false)} aria-label="Close course content" className="rounded px-2 py-1 hover:bg-teal-50">
                ✕
              </button>
            </div>
            {body}
          </div>
          <button type="button" aria-label="Close" className="flex-1 bg-teal-950/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
