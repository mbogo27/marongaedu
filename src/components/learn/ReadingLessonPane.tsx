import NotesPanel from "./NotesPanel";
import LessonFooter from "./LessonFooter";

export default function ReadingLessonPane({
  slug,
  lessonId,
  title,
  html,
  completed,
  prevId,
  nextId,
  noteContent,
}: {
  slug: string;
  lessonId: string;
  title: string;
  html: string;
  completed: boolean;
  prevId?: string;
  nextId?: string;
  noteContent: string;
}) {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-teal-900">{title}</h1>
      <div
        className="prose prose-teal max-w-none rounded-2xl border border-teal-100 bg-white p-6 text-sm text-ink/80 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <NotesPanel lessonId={lessonId} initialContent={noteContent} timestampedNotes={[]} />
      <LessonFooter slug={slug} lessonId={lessonId} completed={completed} prevId={prevId} nextId={nextId} />
    </div>
  );
}
