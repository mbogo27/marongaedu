import LessonFooter from "./LessonFooter";
import NotesPanel from "./NotesPanel";
import AttachmentList from "./AttachmentList";
import type { LessonBody } from "@/lib/lesson-access";

type ReadingBody = Extract<LessonBody, { kind: "reading" }>;

export default function ReadingLessonPane({
  slug,
  lessonId,
  title,
  body,
  completed,
  prevId,
  nextId,
  nextLocked,
  noteContent,
  canTrack,
}: {
  slug: string;
  lessonId: string;
  title: string;
  body: ReadingBody;
  completed: boolean;
  prevId?: string;
  nextId?: string;
  nextLocked?: boolean;
  noteContent: string;
  canTrack: boolean;
}) {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-teal-900">{title}</h1>
      {/* body.html has been through the server-side sanitizer (src/lib/lesson-access.ts). */}
      <article
        className="max-w-none rounded-2xl border border-teal-100 bg-white p-6 text-[15px] leading-relaxed text-ink/90 [&_a]:text-teal-800 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-teal-200 [&_blockquote]:pl-4 [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:font-serif [&_h2]:text-xl [&_h3]:mb-1 [&_h3]:mt-4 [&_h3]:font-semibold [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-lg [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-teal-950 [&_pre]:p-3 [&_pre]:text-teal-50 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: body.html }}
      />
      <AttachmentList items={body.attachments} />
      {canTrack && <NotesPanel lessonId={lessonId} initialContent={noteContent} timestampedNotes={[]} courseNotesHref={`/learn/${slug}/notes`} />}
      <LessonFooter slug={slug} lessonId={lessonId} completed={completed} prevId={prevId} nextId={nextId} nextLocked={nextLocked} hideMarkComplete={!canTrack} />
    </div>
  );
}
