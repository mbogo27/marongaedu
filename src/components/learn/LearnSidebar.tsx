"use client";

import Link from "next/link";
import { useState } from "react";
import { formatDuration } from "@/lib/format";

const TYPE_ICON: Record<string, string> = {
  VIDEO: "M8 5v14l11-7z",
  READING: "M4 4h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z",
  QUIZ: "M9 21h6M12 3a6 6 0 00-4 10.5c.5.5.8 1 .8 1.7V17h6.4v-1.8c0-.7.3-1.2.8-1.7A6 6 0 0012 3z",
  RESOURCE: "M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z",
};

export type SidebarLesson = { id: string; title: string; type: string; durationSeconds: number; completed: boolean };
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
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const completedLessons = modules.reduce((s, m) => s + m.lessons.filter((l) => l.completed).length, 0);

  const body = (
    <>
      <div className="border-b border-teal-100 p-4">
        <p className="text-sm font-medium text-ink">
          {completedLessons} of {totalLessons} lessons complete
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-teal-50">
          <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <nav className="divide-y divide-teal-50">
        {modules.map((mod) => (
          <div key={mod.id}>
            <p className="bg-teal-50/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
              {mod.title}
            </p>
            <ul>
              {mod.lessons.map((lesson) => (
                <li key={lesson.id}>
                  <Link
                    href={`/learn/${slug}?lesson=${lesson.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                      lesson.id === currentLessonId ? "bg-teal-600 text-white" : "text-ink/80 hover:bg-teal-50"
                    }`}
                  >
                    {lesson.completed ? (
                      <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${lesson.id === currentLessonId ? "fill-white" : "fill-teal-600"}`}>
                        <path d="M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 ${lesson.id === currentLessonId ? "fill-white/70" : "fill-ink/30"}`}>
                        <path d={TYPE_ICON[lesson.type] ?? TYPE_ICON.VIDEO} />
                      </svg>
                    )}
                    <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                    <span className={`shrink-0 text-xs ${lesson.id === currentLessonId ? "text-white/70" : "text-ink/40"}`}>
                      {formatDuration(lesson.durationSeconds)}
                    </span>
                  </Link>
                </li>
              ))}
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
          className="rounded-full border border-teal-100 px-4 py-2 text-sm font-medium text-teal-700"
        >
          Course content
        </button>
      </div>
      <aside className="hidden w-80 shrink-0 overflow-y-auto border-r border-teal-100 bg-white lg:block">
        {body}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-80 max-w-[85vw] overflow-y-auto bg-white">
            <div className="flex items-center justify-between border-b border-teal-100 p-4">
              <p className="font-serif text-teal-900">Course content</p>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            {body}
          </div>
          <div className="flex-1 bg-teal-950/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
