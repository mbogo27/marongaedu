import type { Module } from "@/lib/types";

function formatModuleDuration(mod: Module): string {
  const total = mod.lessons.reduce((sum, l) => sum + l.minutes, 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export default function CurriculumAccordion({ modules }: { modules: Module[] }) {
  const lessonCount = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="rounded-2xl border border-teal-100 bg-white">
      <div className="flex items-center justify-between border-b border-teal-100 px-5 py-4">
        <h3 className="font-serif text-lg text-teal-900">Curriculum</h3>
        <span className="text-sm text-ink/50">
          {modules.length} modules · {lessonCount} lessons
        </span>
      </div>
      <div className="divide-y divide-teal-100">
        {modules.map((mod, i) => (
          <details key={mod.title} className="group" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-teal-50/60">
              <div className="flex items-center gap-3">
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4 shrink-0 fill-teal-600 transition group-open:rotate-90"
                >
                  <path d="M7 5l6 5-6 5V5z" />
                </svg>
                <span className="font-medium text-ink">{mod.title}</span>
              </div>
              <span className="shrink-0 text-sm text-ink/50">
                {mod.lessons.length} lessons · {formatModuleDuration(mod)}
              </span>
            </summary>
            <ul className="space-y-1 px-5 pb-4 pl-12">
              {mod.lessons.map((lesson) => (
                <li
                  key={lesson.title}
                  className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm text-ink/80 hover:bg-teal-50/60"
                >
                  <span className="flex items-center gap-2">
                    {lesson.preview ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-gold-600">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-ink/30">
                        <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v9a2 2 0 002 2h12a2 2 0 002-2v-9a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z" />
                      </svg>
                    )}
                    {lesson.title}
                    {lesson.preview && (
                      <span className="rounded-full bg-gold-300/40 px-2 py-0.5 text-xs font-medium text-gold-600">
                        Free preview
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-ink/40">{lesson.minutes} min</span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
