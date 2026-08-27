import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { parseLessonContent, type VideoLessonContent, type ReadingLessonContent, type ResourceLessonContent, type QuizLessonContent } from "@/lib/content-types";
import LearnSidebar from "@/components/learn/LearnSidebar";
import VideoLessonPane from "@/components/learn/VideoLessonPane";
import ReadingLessonPane from "@/components/learn/ReadingLessonPane";
import ResourceLessonPane from "@/components/learn/ResourceLessonPane";
import QuizLessonPane from "@/components/learn/QuizLessonPane";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import Link from "next/link";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string; enrolled?: string }>;
}) {
  const { slug } = await params;
  const { lesson: lessonParam, enrolled } = await searchParams;
  const user = await requireUser();

  const course = await db.course.findUnique({
    where: { slug },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            include: { quizQuestions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
          },
        },
      },
    },
  });
  if (!course) notFound();

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  if (!enrollment) redirect(`/courses/${slug}`);

  const progressRows = await db.lessonProgress.findMany({ where: { enrollmentId: enrollment.id } });
  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));

  const allLessons = course.modules.flatMap((m) => m.lessons);
  if (allLessons.length === 0) notFound();

  const currentLessonId =
    lessonParam && allLessons.some((l) => l.id === lessonParam)
      ? lessonParam
      : enrollment.lastLessonId && allLessons.some((l) => l.id === enrollment.lastLessonId)
        ? enrollment.lastLessonId
        : allLessons[0].id;

  const currentIndex = allLessons.findIndex((l) => l.id === currentLessonId);
  const currentLesson = allLessons[currentIndex];
  const prevId = currentIndex > 0 ? allLessons[currentIndex - 1].id : undefined;
  const nextId = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1].id : undefined;

  const notes = await db.lessonNote.findMany({
    where: { userId: user.id, lessonId: currentLessonId },
    orderBy: { createdAt: "desc" },
  });
  const plainNote = notes.find((n) => n.videoTimestampSeconds == null);
  const timestampedNotes = notes
    .filter((n) => n.videoTimestampSeconds != null)
    .map((n) => ({ ...n, createdAt: n.createdAt.toISOString() }));

  const currentProgress = progressByLesson.get(currentLessonId);
  const sidebarModules = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
      durationSeconds: l.durationSeconds,
      completed: progressByLesson.get(l.id)?.completed ?? false,
    })),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      {!user.verifiedAt && <EmailVerifyBanner />}
      {enrolled === "success" && (
        <div className="bg-teal-600 px-4 py-2 text-center text-sm text-white">
          You&apos;re enrolled! Dive into your first lesson below.
        </div>
      )}
      <header className="flex items-center justify-between border-b border-teal-100 bg-white px-4 py-3">
        <Link href="/dashboard" className="text-sm font-medium text-teal-700 hover:underline">
          ← Back to dashboard
        </Link>
        <p className="truncate text-sm font-medium text-ink">{course.title}</p>
        <span className="w-24" />
      </header>
      <div className="flex flex-1 flex-col lg:flex-row">
        <LearnSidebar
          slug={slug}
          modules={sidebarModules}
          currentLessonId={currentLessonId}
          progressPercent={enrollment.progressPercent}
        />
        <main className="flex-1 bg-teal-50/30 p-4 sm:p-8">
          <div className="mx-auto max-w-3xl">
            {currentLesson.type === "VIDEO" &&
              (() => {
                const content = parseLessonContent<VideoLessonContent>(currentLesson.content);
                return (
                  <VideoLessonPane
                    slug={slug}
                    lessonId={currentLesson.id}
                    title={currentLesson.title}
                    videoUrl={content.videoUrl}
                    captionUrl={content.captionUrl}
                    initialPositionSeconds={currentProgress?.lastPositionSeconds ?? 0}
                    completed={currentProgress?.completed ?? false}
                    prevId={prevId}
                    nextId={nextId}
                    noteContent={plainNote?.content ?? ""}
                    timestampedNotes={timestampedNotes}
                    resources={[]}
                  />
                );
              })()}

            {currentLesson.type === "READING" &&
              (() => {
                const content = parseLessonContent<ReadingLessonContent>(currentLesson.content);
                return (
                  <ReadingLessonPane
                    slug={slug}
                    lessonId={currentLesson.id}
                    title={currentLesson.title}
                    html={content.html}
                    completed={currentProgress?.completed ?? false}
                    prevId={prevId}
                    nextId={nextId}
                    noteContent={plainNote?.content ?? ""}
                  />
                );
              })()}

            {currentLesson.type === "RESOURCE" &&
              (() => {
                const content = parseLessonContent<ResourceLessonContent>(currentLesson.content);
                return (
                  <ResourceLessonPane
                    slug={slug}
                    lessonId={currentLesson.id}
                    title={currentLesson.title}
                    label={content.label}
                    url={content.url}
                    completed={currentProgress?.completed ?? false}
                    prevId={prevId}
                    nextId={nextId}
                  />
                );
              })()}

            {currentLesson.type === "QUIZ" &&
              (() => {
                const content = parseLessonContent<QuizLessonContent>(currentLesson.content);
                return (
                  <QuizLessonPane
                    slug={slug}
                    lessonId={currentLesson.id}
                    title={currentLesson.title}
                    instructions={content.instructions}
                    questions={currentLesson.quizQuestions.map((q) => ({
                      id: q.id,
                      question: q.question,
                      type: q.type,
                      explanation: q.explanation,
                      options: q.options.map((o) => ({ id: o.id, text: o.text })),
                    }))}
                    alreadyCompleted={currentProgress?.completed ?? false}
                    prevId={prevId}
                    nextId={nextId}
                  />
                );
              })()}
          </div>
        </main>
      </div>
    </div>
  );
}
