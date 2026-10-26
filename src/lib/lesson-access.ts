import "server-only";
import { db } from "@/lib/db";
import { getCourseAccess, type SessionUser } from "@/lib/dal";
import { lockedLessonIds } from "@/lib/domain/progress";
import { parseLessonContent, toEmbedUrl, type Attachment } from "@/lib/content-types";
import { sanitizeRichText } from "@/lib/sanitize";
import { getStorage, SIGNED_URL_TTL_SEC } from "@/lib/storage";

/**
 * The single guarded path to lesson content (spec §5.3). Everything that
 * serves lesson bodies — the /learn page, the preview modal and the JSON API —
 * goes through `getLessonView`, so access rules live in exactly one place:
 *
 *   free-preview lesson  → anyone (guests included)
 *   otherwise            → active enrollment, or admin
 *   + sequential courses → the previous lesson must be complete (not for admin)
 *
 * Private media is returned as short-lived signed URLs, never stored keys.
 */

export type ResolvedAttachment = { label: string; kind: "file" | "link"; href: string; filename?: string };

export type LessonBody =
  | {
      kind: "video";
      source: "file" | "youtube" | "vimeo";
      src: string;
      captions: { label: string; lang: string; src: string }[];
      transcript: string;
      attachments: ResolvedAttachment[];
    }
  | { kind: "reading"; html: string; attachments: ResolvedAttachment[] }
  | { kind: "resource"; description: string; resource: ResolvedAttachment | null }
  | {
      kind: "quiz";
      instructions: string;
      passMark: number;
      // correct answers + explanations are withheld until the attempt is graded server-side
      questions: { id: string; question: string; type: "SINGLE" | "MULTI" | "TRUEFALSE"; options: { id: string; text: string }[] }[];
    };

export type LessonView =
  | { ok: false; reason: "not_found" | "forbidden" | "locked" }
  | {
      ok: true;
      lesson: { id: string; title: string; type: "VIDEO" | "READING" | "QUIZ" | "RESOURCE"; durationSeconds: number; isFreePreview: boolean };
      course: { id: string; slug: string; title: string };
      body: LessonBody;
      /** Signed URLs stop working after this; the client may re-request the lesson. */
      expiresAt: number;
    };

async function resolveAttachment(a: Attachment): Promise<ResolvedAttachment | null> {
  if (a.kind === "link" && a.url) return { label: a.label, kind: "link", href: a.url };
  if (a.kind === "file" && a.key) {
    return { label: a.label, kind: "file", href: await getStorage().getSignedUrl(a.key, SIGNED_URL_TTL_SEC), filename: a.filename };
  }
  return null;
}

async function resolveAll(list: Attachment[]): Promise<ResolvedAttachment[]> {
  return (await Promise.all(list.map(resolveAttachment))).filter((x): x is ResolvedAttachment => !!x);
}

/** Ordered lesson ids for a course (module order, then lesson order). */
export async function orderedLessonIds(courseId: string): Promise<string[]> {
  const modules = await db.module.findMany({
    where: { courseId },
    orderBy: { sortOrder: "asc" },
    select: { lessons: { orderBy: { sortOrder: "asc" }, select: { id: true } } },
  });
  return modules.flatMap((m) => m.lessons.map((l) => l.id));
}

/** Is `lessonId` locked for this enrollment under the course's sequential setting? */
export async function isLessonLocked(course: { id: string; requireSequential: boolean }, enrollmentId: string, lessonId: string): Promise<boolean> {
  if (!course.requireSequential) return false;
  const [ids, done] = await Promise.all([
    orderedLessonIds(course.id),
    db.lessonProgress.findMany({ where: { enrollmentId, completed: true }, select: { lessonId: true } }),
  ]);
  return lockedLessonIds(ids, new Set(done.map((d) => d.lessonId)), true).has(lessonId);
}

export async function getLessonView(viewer: SessionUser | null, lessonId: string): Promise<LessonView> {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: true } },
      quizQuestions: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!lesson) return { ok: false, reason: "not_found" };
  const course = lesson.module.course;
  const isAdmin = viewer?.role === "ADMIN";
  if (!isAdmin && (course.status !== "PUBLISHED" || course.deletedAt)) return { ok: false, reason: "not_found" };

  const access = viewer ? await getCourseAccess(viewer, course.id) : null;
  if (!lesson.isFreePreview && !access) {
    // Don't reveal that a draft/paid lesson exists to people with no access.
    return { ok: false, reason: viewer ? "forbidden" : "forbidden" };
  }

  // Sequential unlocking applies to enrolled learners (not admins, not guest previews).
  if (access?.kind === "enrolled" && (await isLessonLocked(course, access.enrollment.id, lesson.id))) {
    return { ok: false, reason: "locked" };
  }

  const parsed = parseLessonContent(lesson.type, lesson.content);
  let body: LessonBody;

  switch (parsed.type) {
    case "VIDEO": {
      const c = parsed.content;
      let src = "";
      if (c.source === "file" && c.key) src = await getStorage().getSignedUrl(c.key, SIGNED_URL_TTL_SEC);
      else if (c.source !== "file" && c.url) src = toEmbedUrl(c.source, c.url) ?? "";
      const captions = await Promise.all(
        c.captions.map(async (cap) => ({ label: cap.label, lang: cap.lang, src: await getStorage().getSignedUrl(cap.key, SIGNED_URL_TTL_SEC) }))
      );
      body = { kind: "video", source: c.source, src, captions, transcript: c.transcript, attachments: await resolveAll(c.attachments) };
      break;
    }
    case "READING":
      body = { kind: "reading", html: sanitizeRichText(parsed.content.html), attachments: await resolveAll(parsed.content.attachments) };
      break;
    case "RESOURCE":
      body = {
        kind: "resource",
        description: parsed.content.description,
        resource: parsed.content.resource ? await resolveAttachment(parsed.content.resource) : null,
      };
      break;
    case "QUIZ":
      body = {
        kind: "quiz",
        instructions: parsed.content.instructions,
        passMark: lesson.passMark,
        questions: lesson.quizQuestions.map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          options: q.options.map((o) => ({ id: o.id, text: o.text })),
        })),
      };
      break;
  }

  return {
    ok: true,
    lesson: { id: lesson.id, title: lesson.title, type: lesson.type, durationSeconds: lesson.durationSeconds, isFreePreview: lesson.isFreePreview },
    course: { id: course.id, slug: course.slug, title: course.title },
    body,
    expiresAt: Date.now() + SIGNED_URL_TTL_SEC * 1000,
  };
}
