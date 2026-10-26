import LessonFooter from "./LessonFooter";
import type { LessonBody } from "@/lib/lesson-access";

type ResourceBody = Extract<LessonBody, { kind: "resource" }>;

export default function ResourceLessonPane({
  slug,
  lessonId,
  title,
  body,
  completed,
  prevId,
  nextId,
  nextLocked,
  canTrack,
}: {
  slug: string;
  lessonId: string;
  title: string;
  body: ResourceBody;
  completed: boolean;
  prevId?: string;
  nextId?: string;
  nextLocked?: boolean;
  canTrack: boolean;
}) {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-teal-900">{title}</h1>
      <div className="rounded-2xl border border-teal-100 bg-white p-6">
        {body.description && <p className="mb-4 text-sm text-ink/80">{body.description}</p>}
        {body.resource ? (
          <a
            href={body.resource.href}
            target="_blank"
            rel="noopener noreferrer"
            {...(body.resource.kind === "file" ? { download: body.resource.filename ?? true } : {})}
            className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            {body.resource.kind === "file" ? "⬇ Download" : "↗ Open"} {body.resource.label}
          </a>
        ) : (
          <p className="text-sm text-ink/70">No resource has been attached to this lesson yet.</p>
        )}
      </div>
      <LessonFooter slug={slug} lessonId={lessonId} completed={completed} prevId={prevId} nextId={nextId} nextLocked={nextLocked} hideMarkComplete={!canTrack} />
    </div>
  );
}
