import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getCourseAccess, requireUser } from "@/lib/dal";
import { getLessonView } from "@/lib/lesson-access";
import { lockedLessonIds, nextLessonId } from "@/lib/domain/progress";
import { resolveSlugRedirect } from "@/lib/queries";
import LearnSidebar from "@/components/learn/LearnSidebar";
import VideoLessonPane from "@/components/learn/VideoLessonPane";
import ReadingLessonPane from "@/components/learn/ReadingLessonPane";
import ResourceLessonPane from "@/components/learn/ResourceLessonPane";
import QuizLessonPane from "@/components/learn/QuizLessonPane";
import Discussion, { type CommentNode } from "@/components/learn/Discussion";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";

export const metadata: Metadata = { title: "Learn", robots: { index: false } };

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lesson?: string; enrolled?: string; t?: string }>;
}) {
  const { slug } = await params;
  const { lesson: lessonParam, enrolled, t: tParam } = await searchParams;
  const user = await requireUser(`/learn/${slug}`);

  const course = await db.course.findFirst({
    where: { slug, deletedAt: null },
    include: {
      modules: {
        orderBy: { sortOrder: "asc" },
        include: {
          lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, type: true, durationSeconds: true } },
        },
      },
    },
  });
  if (!course) {
    const moved = await resolveSlugRedirect(slug);
    if (moved) permanentRedirect(`/learn/${moved}`);
    notFound();
  }

  // Revoked / never-enrolled users are sent to the course page; admins may view any course.
  const access = await getCourseAccess(user, course.id);
  if (!access) redirect(`/courses/${slug}`);
  if (course.status !== "PUBLISHED" && access.kind !== "admin") notFound();

  const enrollment = access.enrollment && access.enrollment.status === "ACTIVE" ? access.enrollment : null;
  const progressRows = enrollment ? await db.lessonProgress.findMany({ where: { enrollmentId: enrollment.id } }) : [];
  const progressByLesson = new Map(progressRows.map((p) => [p.lessonId, p]));
  const completed = new Set(progressRows.filter((p) => p.completed).map((p) => p.lessonId));

  const allLessons = course.modules.flatMap((m) => m.lessons);
  if (allLessons.length === 0) notFound();
  const orderedIds = allLessons.map((l) => l.id);

  // Sequential unlocking applies to learners, not to admins previewing.
  const locked = access.kind === "enrolled" ? lockedLessonIds(orderedIds, completed, course.requireSequential) : new Set<string>();

  const firstUnlockedIncomplete = orderedIds.find((id) => !completed.has(id) && !locked.has(id));
  const fallback =
    (enrollment?.lastLessonId && orderedIds.includes(enrollment.lastLessonId) && !locked.has(enrollment.lastLessonId) ? enrollment.lastLessonId : null) ??
    firstUnlockedIncomplete ??
    nextLessonId(orderedIds, completed) ??
    orderedIds[0];
  const currentLessonId = lessonParam && orderedIds.includes(lessonParam) ? lessonParam : fallback;

  const currentIndex = orderedIds.indexOf(currentLessonId);
  const prevId = currentIndex > 0 ? orderedIds[currentIndex - 1] : undefined;
  const nextId = currentIndex < orderedIds.length - 1 ? orderedIds[currentIndex + 1] : undefined;
  const nextLocked = nextId ? locked.has(nextId) || (course.requireSequential && access.kind === "enrolled" && !completed.has(currentLessonId)) : false;

  const view = await getLessonView(user, currentLessonId);
  const currentMeta = allLessons[currentIndex];
  const currentProgress = progressByLesson.get(currentLessonId);
  const canTrack = !!enrollment;

  const sidebarModules = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
      durationSeconds: l.durationSeconds,
      completed: completed.has(l.id),
      locked: locked.has(l.id),
    })),
  }));

  const notes = canTrack ? await db.lessonNote.findMany({ where: { userId: user.id, lessonId: currentLessonId }, orderBy: { createdAt: "desc" } }) : [];
  const plainNote = notes.find((n) => n.videoTimestampSeconds == null);
  const timestampedNotes = notes
    .filter((n) => n.videoTimestampSeconds != null)
    .map((n) => ({ id: n.id, content: n.content, videoTimestampSeconds: n.videoTimestampSeconds, createdAt: n.createdAt.toISOString() }));

  let comments: CommentNode[] = [];
  if (env.FEATURE_DISCUSSIONS && view.ok) {
    const rows = await db.lessonComment.findMany({
      where: { lessonId: currentLessonId, hiddenAt: null },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });
    const nodes = new Map<string, CommentNode>(
      rows.map((r) => [r.id, { id: r.id, body: r.body, author: r.user.name, isInstructor: r.user.role === "ADMIN", createdAt: r.createdAt.toISOString(), replies: [] }])
    );
    for (const r of rows) {
      const node = nodes.get(r.id)!;
      if (r.parentId && nodes.has(r.parentId)) nodes.get(r.parentId)!.replies.push(node);
      else if (!r.parentId) comments.push(node);
    }
    comments = comments.reverse(); // newest threads first
  }

  const common = {
    slug,
    lessonId: currentLessonId,
    title: currentMeta.title,
    prevId,
    nextId,
    nextLocked,
    canTrack,
  };

  // `?t=SECONDS` (from the notes page) wins over the saved resume position.
  const startAt = Number(tParam) > 0 ? Number(tParam) : (currentProgress?.lastPositionSeconds ?? 0);

  return (
    <div className="flex min-h-screen flex-col">
      {!user.emailVerifiedAt && <EmailVerifyBanner />}
      {access.kind === "admin" && !enrollment && (
        <div role="status" className="bg-gold-500 px-4 py-2 text-center text-sm font-semibold text-teal-900">
          Admin preview — progress is not recorded.
        </div>
      )}
      {enrolled === "success" && (
        <div role="status" className="bg-teal-700 px-4 py-2 text-center text-sm text-white">
          You&apos;re enrolled! Dive into your first lesson below.
        </div>
      )}
      <header className="flex items-center justify-between gap-4 border-b border-teal-100 bg-white px-4 py-3">
        <Link href="/dashboard" className="shrink-0 text-sm font-medium text-teal-800 underline-offset-2 hover:underline">
          ← Dashboard
        </Link>
        <p className="truncate text-sm font-medium text-ink">{course.title}</p>
        <Link href={`/learn/${slug}/notes`} className="shrink-0 text-sm font-medium text-teal-800 underline-offset-2 hover:underline">
          My notes
        </Link>
      </header>
      <div className="flex flex-1 flex-col lg:flex-row">
        <LearnSidebar slug={slug} modules={sidebarModules} currentLessonId={currentLessonId} progressPercent={enrollment?.progressPercent ?? 0} />
        <main id="main" className="min-w-0 flex-1 bg-teal-50/30 p-4 sm:p-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {!view.ok ? (
              <div role="alert" className="rounded-2xl border border-gold-300 bg-gold-50 p-6 text-center">
                <h1 className="font-serif text-xl text-teal-900">{view.reason === "locked" ? "This lesson is locked" : "Lesson unavailable"}</h1>
                <p className="mt-2 text-sm text-ink/80">
                  {view.reason === "locked" ? "Complete the previous lesson to unlock this one." : "You do not have access to this lesson."}
                </p>
                <Link href={`/learn/${slug}`} className="mt-4 inline-block rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800">
                  Back to the course
                </Link>
              </div>
            ) : (
              <>
                {view.body.kind === "video" && (
                  <VideoLessonPane
                    key={currentLessonId}
                    {...common}
                    body={view.body}
                    initialPositionSeconds={startAt}
                    completed={currentProgress?.completed ?? false}
                    noteContent={plainNote?.content ?? ""}
                    timestampedNotes={timestampedNotes}
                  />
                )}
                {view.body.kind === "reading" && (
                  <ReadingLessonPane key={currentLessonId} {...common} body={view.body} completed={currentProgress?.completed ?? false} noteContent={plainNote?.content ?? ""} />
                )}
                {view.body.kind === "resource" && (
                  <ResourceLessonPane key={currentLessonId} {...common} body={view.body} completed={currentProgress?.completed ?? false} />
                )}
                {view.body.kind === "quiz" && (
                  <QuizLessonPane
                    key={currentLessonId}
                    {...common}
                    body={view.body}
                    alreadyPassed={currentProgress?.completed ?? false}
                    bestScore={currentProgress?.bestScorePercent ?? null}
                  />
                )}
                {env.FEATURE_DISCUSSIONS && <Discussion lessonId={currentLessonId} comments={comments} isAdmin={user.role === "ADMIN"} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
