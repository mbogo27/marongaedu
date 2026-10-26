import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCourseAccess, requireUser } from "@/lib/dal";
import { formatTime } from "@/components/learn/NotesPanel";

export const metadata: Metadata = { title: "My notes", robots: { index: false } };

/** Every note the learner took in this course, grouped by lesson, with jump-to-timestamp links (spec §5.3). */
export default async function CourseNotesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/learn/${slug}/notes`);
  const course = await db.course.findFirst({
    where: { slug, deletedAt: null },
    include: { modules: { orderBy: { sortOrder: "asc" }, include: { lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true } } } } },
  });
  if (!course) notFound();
  if (!(await getCourseAccess(user, course.id))) redirect(`/courses/${slug}`);

  const notes = await db.lessonNote.findMany({
    where: { userId: user.id, lesson: { module: { courseId: course.id } } },
    orderBy: [{ videoTimestampSeconds: "asc" }, { createdAt: "asc" }],
  });
  const lessons = course.modules.flatMap((m) => m.lessons).filter((l) => notes.some((n) => n.lessonId === l.id));

  return (
    <main id="main" className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:px-6">
      <Link href={`/learn/${slug}`} className="text-sm font-medium text-teal-800 underline-offset-2 hover:underline">
        ← Back to {course.title}
      </Link>
      <h1 className="mt-4 font-serif text-3xl text-teal-900">My notes</h1>
      {lessons.length === 0 ? (
        <p className="mt-6 text-ink/70">You have not taken any notes in this course yet.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {lessons.map((lesson) => (
            <section key={lesson.id} aria-labelledby={`n-${lesson.id}`} className="rounded-2xl border border-teal-100 bg-white p-5">
              <h2 id={`n-${lesson.id}`} className="font-serif text-lg text-teal-900">
                <Link href={`/learn/${slug}?lesson=${lesson.id}`} className="hover:underline">
                  {lesson.title}
                </Link>
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {notes
                  .filter((n) => n.lessonId === lesson.id)
                  .map((n) => (
                    <li key={n.id} className="flex gap-2">
                      {n.videoTimestampSeconds != null && (
                        <Link
                          href={`/learn/${slug}?lesson=${lesson.id}&t=${n.videoTimestampSeconds}`}
                          className="shrink-0 rounded bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-900 hover:bg-teal-100"
                        >
                          {formatTime(n.videoTimestampSeconds)}
                        </Link>
                      )}
                      <span className="whitespace-pre-line text-ink/80">{n.content}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
