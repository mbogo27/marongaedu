"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser, getCourseAccess, requireUser, type SessionUser } from "@/lib/dal";
import { gradeQuiz, type QuestionResult } from "@/lib/domain/quiz";
import { isVideoWatched } from "@/lib/domain/progress";
import { isLessonLocked } from "@/lib/lesson-access";
import { getLessonView } from "@/lib/lesson-access";
import { setLessonCompletion } from "@/lib/progress";
import { getRateLimiter } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";
import { t } from "@/lib/i18n";

/**
 * Loads a lesson plus the caller's course access, enforcing in one place that
 * the caller may touch this lesson's progress (enrolled & unlocked). Admins
 * pass the access check but only record progress if they hold an enrollment.
 */
async function lessonContext(lessonId: string) {
  const user = await requireUser();
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: { include: { course: true } } } });
  if (!lesson) throw new Error(t("common.not_found"));
  const course = lesson.module.course;
  const access = await getCourseAccess(user, course.id);
  if (!access) throw new Error(t("learn.not_enrolled"));
  if (access.kind === "enrolled" && (await isLessonLocked(course, access.enrollment.id, lesson.id))) {
    throw new Error(t("learn.locked_sequential"));
  }
  return { user, lesson, course, enrollment: access.enrollment };
}

export async function savePositionAction(lessonId: string, positionSeconds: number) {
  const { lesson, enrollment } = await lessonContext(lessonId);
  if (!enrollment || enrollment.status !== "ACTIVE") return { ok: false as const };
  const position = Math.max(0, Math.min(Math.floor(positionSeconds) || 0, 24 * 3600));

  await db.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
    update: { lastPositionSeconds: position },
    create: { enrollmentId: enrollment.id, lessonId, lastPositionSeconds: position },
  });
  await db.enrollment.update({ where: { id: enrollment.id }, data: { lastLessonId: lessonId } });

  // Auto-complete at ≥ 90% watched (spec §5.3).
  let completed = false;
  if (lesson.type === "VIDEO" && isVideoWatched(position, lesson.durationSeconds)) {
    const prog = await db.lessonProgress.findUnique({ where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } } });
    if (!prog?.completed) {
      await setLessonCompletion(enrollment.id, lessonId, true);
      completed = true;
    }
  }
  return { ok: true as const, completed };
}

export async function setLessonCompleteAction(lessonId: string, completed: boolean) {
  const { lesson, course, enrollment } = await lessonContext(lessonId);
  if (!enrollment || enrollment.status !== "ACTIVE") return { ok: false as const, percent: 0 };
  // Quizzes complete only by passing (spec §5.3).
  if (lesson.type === "QUIZ") return { ok: false as const, percent: enrollment.progressPercent };

  const percent = await setLessonCompletion(enrollment.id, lessonId, completed);
  await db.enrollment.update({ where: { id: enrollment.id }, data: { lastLessonId: lessonId } });
  revalidatePath(`/learn/${course.slug}`);
  return { ok: true as const, percent };
}

export type QuizSubmission = Record<string, string[]>; // questionId → selected option ids

export type QuizOutcome =
  | { ok: false; error: string }
  | { ok: true; scorePercent: number; passed: boolean; passMark: number; results: QuestionResult[]; percent?: number };

export async function submitQuizAction(lessonId: string, answers: QuizSubmission): Promise<QuizOutcome> {
  let ctx;
  try {
    ctx = await lessonContext(lessonId);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : t("auth.generic_error") };
  }
  const { user, lesson, course, enrollment } = ctx;
  if (lesson.type !== "QUIZ") return { ok: false, error: t("common.not_found") };

  // Throttle brute-forcing the answers (30 submissions / hour / lesson).
  const rl = await getRateLimiter().consume(`quiz:${user.id}:${lessonId}`, 30, 3600);
  if (rl.blocked) return { ok: false, error: t("auth.too_many_attempts", { wait: "a while" }) };

  const questions = await db.quizQuestion.findMany({ where: { lessonId }, include: { options: true } });
  const result = gradeQuiz(questions, answers, lesson.passMark);

  let percent: number | undefined;
  if (enrollment && enrollment.status === "ACTIVE") {
    await db.quizAttempt.create({
      data: { enrollmentId: enrollment.id, userId: user.id, lessonId, answers, scorePercent: result.scorePercent, passed: result.passed },
    });
    const prog = await db.lessonProgress.findUnique({ where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } } });
    await db.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } },
      update: { bestScorePercent: Math.max(prog?.bestScorePercent ?? 0, result.scorePercent) },
      create: { enrollmentId: enrollment.id, lessonId, bestScorePercent: result.scorePercent },
    });
    // Passing completes the lesson; a later failed retake never un-completes it.
    if (result.passed) {
      percent = await setLessonCompletion(enrollment.id, lessonId, true);
      await db.enrollment.update({ where: { id: enrollment.id }, data: { lastLessonId: lessonId } });
    }
  }
  track("quiz_submitted", { lessonId, scorePercent: result.scorePercent, passed: result.passed });
  revalidatePath(`/learn/${course.slug}`);
  return { ok: true, scorePercent: result.scorePercent, passed: result.passed, passMark: lesson.passMark, results: result.results, percent };
}

/* ---------------- notes ---------------- */

async function noteContext(lessonId: string) {
  // Notes are for enrolled learners/admins; reuse the lesson access rules.
  const ctx = await lessonContext(lessonId);
  return ctx.user;
}

export async function saveNoteAction(lessonId: string, content: string, videoTimestampSeconds?: number | null, noteId?: string) {
  const user = await noteContext(lessonId);
  const text = content.trim().slice(0, 5000);

  if (noteId) {
    const res = await db.lessonNote.updateMany({ where: { id: noteId, userId: user.id, lessonId }, data: { content: text } });
    return res.count ? noteId : null;
  }
  if (videoTimestampSeconds == null) {
    // The lesson's single free-form note autosaves in place.
    const existing = await db.lessonNote.findFirst({ where: { userId: user.id, lessonId, videoTimestampSeconds: null } });
    if (existing) {
      await db.lessonNote.update({ where: { id: existing.id }, data: { content: text } });
      return existing.id;
    }
  }
  if (!text) return null;
  const note = await db.lessonNote.create({
    data: { userId: user.id, lessonId, content: text, videoTimestampSeconds: videoTimestampSeconds ?? null },
  });
  return note.id;
}

export async function deleteNoteAction(noteId: string) {
  const user = await requireUser();
  await db.lessonNote.deleteMany({ where: { id: noteId, userId: user.id } });
}

/* ---------------- discussions (FEATURE_DISCUSSIONS) ---------------- */

export async function postCommentAction(lessonId: string, body: string, parentId?: string | null) {
  if (!env.FEATURE_DISCUSSIONS) return { ok: false as const, error: t("common.not_found") };
  const { user } = await lessonContext(lessonId);
  const text = body.trim().slice(0, 2000);
  if (text.length < 2) return { ok: false as const, error: "Write a little more." };

  const rl = await getRateLimiter().consume(`comment:${user.id}`, 20, 3600);
  if (rl.blocked) return { ok: false as const, error: t("auth.too_many_attempts", { wait: "a while" }) };

  if (parentId) {
    const parent = await db.lessonComment.findFirst({ where: { id: parentId, lessonId, hiddenAt: null } });
    if (!parent) return { ok: false as const, error: t("common.not_found") };
  }
  await db.lessonComment.create({ data: { lessonId, userId: user.id, body: text, parentId: parentId ?? null } });
  return { ok: true as const };
}

export async function hideCommentAction(commentId: string) {
  const user: SessionUser | null = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error(t("common.forbidden"));
  await db.lessonComment.update({ where: { id: commentId }, data: { hiddenAt: new Date() } });
}

/** Re-request a lesson body (e.g. to refresh expiring signed URLs). */
export async function refreshLessonAction(lessonId: string) {
  const user = await getCurrentUser();
  return getLessonView(user, lessonId);
}
