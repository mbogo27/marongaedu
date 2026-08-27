"use client";

import { useState } from "react";
import { formatDuration } from "@/lib/format";
import { parseLessonContent, type VideoLessonContent } from "@/lib/content-types";
import PreviewPlayer from "./PreviewPlayer";

const TYPE_ICON: Record<string, string> = {
  VIDEO: "M8 5v14l11-7z",
  READING: "M4 4h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z",
  QUIZ: "M9 21h6M12 3a6 6 0 00-4 10.5c.5.5.8 1 .8 1.7V17h6.4v-1.8c0-.7.3-1.2.8-1.7A6 6 0 0012 3z",
  RESOURCE: "M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z",
};

export type CurriculumLesson = {
  id: string;
  title: string;
  type: string;
  durationSeconds: number;
  isFreePreview: boolean;
  content?: string;
};

export type CurriculumModuleData = {
  id: string;
  title: string;
  lessons: CurriculumLesson[];
};

export default function CurriculumAccordion({
  modules,
  posterUrl,
}: {
  modules: CurriculumModuleData[];
  posterUrl: string;
}) {
  const [expandAll, setExpandAll] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<CurriculumLesson | null>(null);
  const lessonCount = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="rounded-2xl border border-teal-100 bg-white">
      <div className="flex items-center justify-between border-b border-teal-100 px-5 py-4">
        <div>
          <h3 className="font-serif text-lg text-teal-900">Curriculum</h3>
          <span className="text-sm text-ink/50">
            {modules.length} modules · {lessonCount} lessons
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExpandAll((v) => !v)}
          className="text-sm font-medium text-teal-700 hover:underline"
        >
          {expandAll ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <div className="divide-y divide-teal-100">
        {modules.map((mod, i) => (
          <details key={mod.id} className="group" open={expandAll || i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-teal-50/60">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-teal-600 transition group-open:rotate-90">
                  <path d="M7 5l6 5-6 5V5z" />
                </svg>
                <span className="font-medium text-ink">{mod.title}</span>
              </div>
              <span className="shrink-0 text-sm text-ink/50">
                {mod.lessons.length} lessons ·{" "}
                {formatDuration(mod.lessons.reduce((s, l) => s + l.durationSeconds, 0))}
              </span>
            </summary>
            <ul className="space-y-1 px-5 pb-4 pl-12">
              {mod.lessons.map((lesson) => (
                <li
                  key={lesson.id}
                  className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm text-ink/80 hover:bg-teal-50/60"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-ink/40">
                      <path d={TYPE_ICON[lesson.type] ?? TYPE_ICON.VIDEO} />
                    </svg>
                    <span className="truncate">{lesson.title}</span>
                    {lesson.isFreePreview && (
                      <span className="shrink-0 rounded-full bg-gold-300/40 px-2 py-0.5 text-xs font-medium text-gold-600">
                        Free preview
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {lesson.isFreePreview && lesson.type === "VIDEO" ? (
                      <button
                        type="button"
                        onClick={() => setPreviewLesson(lesson)}
                        className="text-xs font-semibold text-gold-600 hover:underline"
                      >
                        Preview
                      </button>
                    ) : !lesson.isFreePreview ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-ink/30">
                        <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z" />
                      </svg>
                    ) : null}
                    <span className="text-xs text-ink/40">{formatDuration(lesson.durationSeconds)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      {previewLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/70 px-4"
          onClick={() => setPreviewLesson(null)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between text-white">
              <p className="font-medium">{previewLesson.title}</p>
              <button type="button" onClick={() => setPreviewLesson(null)} aria-label="Close preview">
                ✕
              </button>
            </div>
            {(() => {
              const content = parseLessonContent<VideoLessonContent>(previewLesson.content ?? "{}");
              return (
                <PreviewPlayer
                  src={content.videoUrl}
                  captionUrl={content.captionUrl}
                  posterUrl={posterUrl}
                  title={previewLesson.title}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
