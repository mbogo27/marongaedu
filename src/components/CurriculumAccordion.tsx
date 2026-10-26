"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { formatDuration } from "@/lib/format";
import PreviewPlayer from "@/components/PreviewPlayer";
import { previewLessonAction } from "@/lib/actions/courses";
import type { LessonBody } from "@/lib/lesson-access";

const TYPE_ICON: Record<string, string> = {
  VIDEO: "M8 5v14l11-7z",
  READING: "M4 4h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V6a2 2 0 012-2z",
  QUIZ: "M9 21h6M12 3a6 6 0 00-4 10.5c.5.5.8 1 .8 1.7V17h6.4v-1.8c0-.7.3-1.2.8-1.7A6 6 0 0012 3z",
  RESOURCE: "M16.5 6v11.5a4 4 0 01-8 0V5a2.5 2.5 0 015 0v10.5a1 1 0 01-2 0V6H10v9.5a2.5 2.5 0 005 0V5a4 4 0 00-8 0v12.5a5.5 5.5 0 0011 0V6h-1.5z",
};
const TYPE_LABEL: Record<string, string> = { VIDEO: "Video", READING: "Reading", QUIZ: "Quiz", RESOURCE: "Resource" };

export type CurriculumLesson = {
  id: string;
  title: string;
  type: string;
  durationSeconds: number;
  isFreePreview: boolean;
};

export type CurriculumModuleData = {
  id: string;
  title: string;
  description?: string | null;
  lessons: CurriculumLesson[];
};

export default function CurriculumAccordion({ modules, posterUrl }: { modules: CurriculumModuleData[]; posterUrl: string }) {
  const [expandAll, setExpandAll] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ [modules[0]?.id]: true }));
  const [preview, setPreview] = useState<{ lesson: CurriculumLesson; body: LessonBody | null; loading: boolean } | null>(null);
  const [, startTransition] = useTransition();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previewRequest = useRef(0);
  const lessonCount = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  const isOpen = (id: string) => expandAll || !!open[id];

  function openPreview(lesson: CurriculumLesson) {
    const request = ++previewRequest.current;
    setPreview({ lesson, body: null, loading: true });
    startTransition(async () => {
      const body = await previewLessonAction(lesson.id);
      if (request === previewRequest.current) setPreview({ lesson, body, loading: false });
    });
  }

  // A preview still loading must not reopen the dialog after it was closed.
  function closePreview() {
    previewRequest.current++;
    setPreview(null);
  }

  useEffect(() => {
    if (!preview) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      closePreview();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  return (
    <div className="rounded-2xl border border-teal-100 bg-white">
      <div className="flex items-center justify-between border-b border-teal-100 px-5 py-4">
        <div>
          <h2 className="font-serif text-lg text-teal-900">Curriculum</h2>
          <span className="text-sm text-ink/70">
            {modules.length} modules · {lessonCount} lessons
          </span>
        </div>
        <button type="button" onClick={() => setExpandAll((v) => !v)} className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline">
          {expandAll ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <div className="divide-y divide-teal-100">
        {modules.map((mod) => (
          <div key={mod.id}>
            <h3>
              <button
                type="button"
                aria-expanded={isOpen(mod.id)}
                aria-controls={`mod-${mod.id}`}
                onClick={() => {
                  setExpandAll(false);
                  setOpen((o) => ({ ...o, [mod.id]: !isOpen(mod.id) }));
                }}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-teal-50/60"
              >
                <span className="flex items-center gap-3">
                  <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 fill-teal-700 transition ${isOpen(mod.id) ? "rotate-90" : ""}`} aria-hidden="true">
                    <path d="M7 5l6 5-6 5V5z" />
                  </svg>
                  <span className="font-medium text-ink">{mod.title}</span>
                </span>
                <span className="shrink-0 text-sm text-ink/70">
                  {mod.lessons.length} lessons · {formatDuration(mod.lessons.reduce((s, l) => s + l.durationSeconds, 0))}
                </span>
              </button>
            </h3>
            {isOpen(mod.id) && (
              <ul id={`mod-${mod.id}`} className="space-y-1 px-5 pb-4 sm:pl-12">
                {mod.lessons.map((lesson) => (
                  <li key={lesson.id} className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm text-ink/80 hover:bg-teal-50/60">
                    <span className="flex min-w-0 items-center gap-2">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-ink/50" role="img" aria-label={TYPE_LABEL[lesson.type]}>
                        <path d={TYPE_ICON[lesson.type] ?? TYPE_ICON.VIDEO} />
                      </svg>
                      <span className="truncate">{lesson.title}</span>
                      {lesson.isFreePreview && (
                        <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-xs font-medium text-gold-800">Free preview</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      {lesson.isFreePreview && (lesson.type === "VIDEO" || lesson.type === "READING") ? (
                        <button type="button" onClick={() => openPreview(lesson)} className="text-xs font-semibold text-teal-800 underline underline-offset-2">
                          Preview
                        </button>
                      ) : !lesson.isFreePreview ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-ink/50" role="img" aria-label="Locked">
                          <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z" />
                        </svg>
                      ) : null}
                      <span className="text-xs text-ink/70">{formatDuration(lesson.durationSeconds)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview: ${preview.lesson.title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-teal-950/70 px-4"
          onClick={closePreview}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between text-white">
              <p className="font-medium">{preview.lesson.title}</p>
              <button ref={closeRef} type="button" onClick={closePreview} aria-label="Close preview" className="rounded px-2 py-1 hover:bg-white/10">
                ✕
              </button>
            </div>
            {preview.loading ? (
              <p className="rounded-2xl bg-white p-6 text-sm text-ink/70" role="status">
                Loading preview…
              </p>
            ) : preview.body?.kind === "video" ? (
              <PreviewPlayer source={preview.body.source} src={preview.body.src} captions={preview.body.captions} posterUrl={posterUrl} title={preview.lesson.title} autoPlay />
            ) : preview.body?.kind === "reading" ? (
              <div className="prose max-w-none rounded-2xl bg-white p-6 text-sm text-ink/80 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: preview.body.html }} />
            ) : (
              <p className="rounded-2xl bg-white p-6 text-sm text-ink/70">This preview isn&apos;t available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
