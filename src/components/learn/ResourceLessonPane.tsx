import LessonFooter from "./LessonFooter";

export default function ResourceLessonPane({
  slug,
  lessonId,
  title,
  label,
  url,
  completed,
  prevId,
  nextId,
}: {
  slug: string;
  lessonId: string;
  title: string;
  label: string;
  url: string;
  completed: boolean;
  prevId?: string;
  nextId?: string;
}) {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-teal-900">{title}</h1>
      <div className="rounded-2xl border border-teal-100 bg-white p-8 text-center">
        <p className="text-ink/70">This lesson is a downloadable resource.</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          📎 {label}
        </a>
      </div>
      <LessonFooter slug={slug} lessonId={lessonId} completed={completed} prevId={prevId} nextId={nextId} />
    </div>
  );
}
