import "server-only";
import { Prisma, type CourseStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/format";
import { sanitizeRichText, stripHtml } from "@/lib/sanitize";
import { publishChecklist, type CoursePayload, type LessonPayload } from "@/lib/course-schema";
import { recomputeProgress } from "@/lib/progress";

export type SaveIntent = "autosave" | "save" | "publish" | "unpublish";

export type SaveOutcome =
  | { ok: true; course: { id: string; slug: string; status: CourseStatus; updatedAt: string; slugChanged: boolean } }
  | { ok: false; error: string; missing?: string[] };

const PICSUM_FALLBACK = "";

function toDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function lessonContent(l: LessonPayload): Prisma.InputJsonObject {
  switch (l.type) {
    case "VIDEO":
      return {
        source: l.videoSource,
        key: l.videoSource === "file" ? l.videoKey || null : null,
        url: l.videoSource !== "file" ? l.videoUrl.trim() || null : null,
        captions: l.captions,
        transcript: l.transcript,
        attachments: l.attachments,
      };
    case "READING":
      return { html: sanitizeRichText(l.readingHtml), attachments: l.attachments };
    case "RESOURCE":
      return { resource: l.resource ?? null, description: l.resourceDescription };
    case "QUIZ":
      return { instructions: l.quizInstructions };
  }
}

/** Make `base` unique among course slugs and among redirects that point at other courses. */
async function uniqueSlug(tx: Prisma.TransactionClient, base: string, courseId: string | null): Promise<string> {
  const root = slugify(base) || "course";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const [course, redirect] = await Promise.all([
      tx.course.findUnique({ where: { slug: candidate }, select: { id: true } }),
      tx.slugRedirect.findUnique({ where: { fromSlug: candidate }, select: { courseId: true } }),
    ]);
    const takenByOther = (course && course.id !== courseId) || (redirect && redirect.courseId !== courseId);
    if (!takenByOther) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Persist the whole course editor state in one transaction.
 *
 * Curriculum is SYNCED by id (never delete-and-recreate): existing modules,
 * lessons and quiz questions are updated in place so enrolled learners keep
 * their progress, notes and quiz attempts. New rows reuse the client-minted
 * ids. Ids that belong to another course are rejected.
 */
export async function saveCourse(adminId: string, courseId: string | null, payload: CoursePayload, intent: SaveIntent): Promise<SaveOutcome> {
  const existing = courseId ? await db.course.findFirst({ where: { id: courseId, deletedAt: null } }) : null;
  if (courseId && !existing) return { ok: false, error: "Course not found." };

  // ---- resolve the status this save results in ----
  let status: CourseStatus;
  if (intent === "publish") status = "PUBLISHED";
  else if (intent === "unpublish") status = "DRAFT";
  else if (intent === "autosave") status = existing?.status ?? "DRAFT";
  else status = payload.status;
  // Becoming published always goes through validation, whichever button was used.
  const becomingPublished = status === "PUBLISHED" && existing?.status !== "PUBLISHED";

  const category = payload.categoryId ? await db.category.findUnique({ where: { id: payload.categoryId } }) : null;
  const slugGuess = payload.slug.trim() || payload.title;

  if (becomingPublished || (status === "PUBLISHED" && intent !== "autosave")) {
    const missing = publishChecklist({ ...payload, slug: slugGuess, categoryId: category?.id ?? "" })
      .filter((i) => i.required && !i.ok)
      .map((i) => i.label);
    if (missing.length) return { ok: false, error: `Can't publish yet — missing: ${missing.join(", ")}.`, missing };
  }
  if (!category) {
    return { ok: false, error: payload.categoryId ? "That category no longer exists." : "Choose a category (create one first under Categories if none exist)." };
  }

  // ---- reject ids that belong to other courses ----
  const moduleIds = payload.modules.map((m) => m.id);
  const lessonIds = payload.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const questionIds = payload.modules.flatMap((m) => m.lessons.flatMap((l) => l.questions.map((q) => q.id)));
  const optionIds = payload.modules.flatMap((m) => m.lessons.flatMap((l) => l.questions.flatMap((q) => q.options.map((o) => o.id))));
  for (const [label, ids] of [["module", moduleIds], ["lesson", lessonIds], ["question", questionIds], ["option", optionIds]] as const) {
    if (new Set(ids).size !== ids.length) return { ok: false, error: `Duplicate ${label} ids in the curriculum.` };
  }

  const result = await db.$transaction(
    async (tx) => {
      const [foreignModules, foreignLessons, foreignQuestions, foreignOptions] = await Promise.all([
        tx.module.count({ where: { id: { in: moduleIds }, NOT: { courseId: courseId ?? "" } } }),
        tx.lesson.count({ where: { id: { in: lessonIds }, NOT: { module: { courseId: courseId ?? "" } } } }),
        tx.quizQuestion.count({ where: { id: { in: questionIds }, NOT: { lesson: { module: { courseId: courseId ?? "" } } } } }),
        tx.quizOption.count({ where: { id: { in: optionIds }, NOT: { question: { lesson: { module: { courseId: courseId ?? "" } } } } } }),
      ]);
      if (foreignModules + foreignLessons + foreignQuestions + foreignOptions > 0) throw new Error("INVALID_IDS");

      const slug = await uniqueSlug(tx, slugGuess, existing?.id ?? null);
      const isFree = payload.isFree;
      const data = {
        title: payload.title.trim(),
        slug,
        subtitle: payload.subtitle.trim() || null,
        description: sanitizeRichText(payload.description),
        shortDescription: stripHtml(payload.shortDescription).slice(0, 200),
        categoryId: category.id,
        level: payload.level,
        language: payload.language.trim() || "English",
        priceKes: isFree ? 0 : payload.priceKes,
        salePriceKes: isFree ? null : payload.salePriceKes,
        saleEndsAt: isFree ? null : toDate(payload.saleEndsAt),
        isFree,
        thumbnailUrl: payload.thumbnailUrl.trim() || PICSUM_FALLBACK,
        previewVideoUrl: payload.previewVideoUrl.trim(),
        status,
        isFeatured: payload.isFeatured,
        requireSequential: payload.requireSequential,
        enrollmentCap: payload.enrollmentCap,
        enrollmentOpensAt: toDate(payload.enrollmentOpensAt),
        enrollmentClosesAt: toDate(payload.enrollmentClosesAt),
        certificateTemplate: payload.certificateTemplate || "default",
        metaTitle: payload.metaTitle.trim() || null,
        metaDescription: payload.metaDescription.trim() || null,
        ogImageUrl: payload.ogImageUrl.trim() || null,
        ...(status === "PUBLISHED" ? { publishedAt: existing?.publishedAt ?? new Date() } : {}),
      };

      const saved = existing
        ? await tx.course.update({ where: { id: existing.id }, data })
        : await tx.course.create({ data: { ...data, instructorId: adminId } });

      // Old URLs keep working after a slug change (spec §6).
      let slugChanged = false;
      if (existing && existing.slug !== slug) {
        slugChanged = true;
        await tx.slugRedirect.upsert({ where: { fromSlug: existing.slug }, update: { courseId: saved.id }, create: { fromSlug: existing.slug, courseId: saved.id } });
      }
      await tx.slugRedirect.deleteMany({ where: { fromSlug: slug } });

      // Simple lists: ids carry no history, so replace.
      await Promise.all([
        tx.courseOutcome.deleteMany({ where: { courseId: saved.id } }),
        tx.courseRequirement.deleteMany({ where: { courseId: saved.id } }),
        tx.courseAudience.deleteMany({ where: { courseId: saved.id } }),
      ]);
      const list = (xs: string[]) => xs.map((t) => t.trim()).filter(Boolean).map((text, sortOrder) => ({ courseId: saved.id, text, sortOrder }));
      await Promise.all([
        tx.courseOutcome.createMany({ data: list(payload.outcomes) }),
        tx.courseRequirement.createMany({ data: list(payload.requirements) }),
        tx.courseAudience.createMany({ data: list(payload.audience) }),
      ]);

      // ---- curriculum sync ----
      for (const [mi, mod] of payload.modules.entries()) {
        await tx.module.upsert({
          where: { id: mod.id },
          update: { title: mod.title, description: mod.description || null, sortOrder: mi },
          create: { id: mod.id, courseId: saved.id, title: mod.title, description: mod.description || null, sortOrder: mi },
        });
        for (const [li, lesson] of mod.lessons.entries()) {
          const lessonData = {
            title: lesson.title,
            type: lesson.type,
            durationSeconds: lesson.durationSeconds,
            content: lessonContent(lesson),
            passMark: lesson.passMark,
            isFreePreview: lesson.isFreePreview,
            sortOrder: li,
          };
          await tx.lesson.upsert({
            where: { id: lesson.id },
            update: { ...lessonData, moduleId: mod.id },
            create: { id: lesson.id, moduleId: mod.id, ...lessonData },
          });

          const questions = lesson.type === "QUIZ" ? lesson.questions : [];
          for (const [qi, q] of questions.entries()) {
            await tx.quizQuestion.upsert({
              where: { id: q.id },
              update: { question: q.question, type: q.type, explanation: q.explanation || null, sortOrder: qi },
              create: { id: q.id, lessonId: lesson.id, question: q.question, type: q.type, explanation: q.explanation || null, sortOrder: qi },
            });
            for (const [oi, o] of q.options.entries()) {
              await tx.quizOption.upsert({
                where: { id: o.id },
                update: { text: o.text, isCorrect: o.isCorrect, sortOrder: oi },
                create: { id: o.id, questionId: q.id, text: o.text, isCorrect: o.isCorrect, sortOrder: oi },
              });
            }
            await tx.quizOption.deleteMany({ where: { questionId: q.id, id: { notIn: q.options.map((o) => o.id) } } });
          }
          await tx.quizQuestion.deleteMany({ where: { lessonId: lesson.id, id: { notIn: questions.map((q) => q.id) } } });
        }
      }
      // Removals last, so lessons moved between modules aren't caught by a module cascade.
      await tx.lesson.deleteMany({ where: { module: { courseId: saved.id }, id: { notIn: lessonIds } } });
      await tx.module.deleteMany({ where: { courseId: saved.id, id: { notIn: moduleIds } } });

      // Coupons that apply to this course (restricted coupons only; "all courses" coupons need no rows).
      const restricted = await tx.coupon.findMany({ where: { courses: { some: {} } }, select: { id: true } });
      const restrictedIds = new Set(restricted.map((c) => c.id));
      const wanted = new Set(payload.couponIds.filter((cid) => restrictedIds.has(cid)));
      await tx.couponCourse.deleteMany({ where: { courseId: saved.id, couponId: { in: [...restrictedIds].filter((cid) => !wanted.has(cid)) } } });
      for (const couponId of wanted) {
        await tx.couponCourse.upsert({
          where: { couponId_courseId: { couponId, courseId: saved.id } },
          update: {},
          create: { couponId, courseId: saved.id },
        });
      }

      return { saved, slugChanged };
    },
    { timeout: 30_000, maxWait: 10_000 }
  ).catch((e: unknown) => {
    if (e instanceof Error && e.message === "INVALID_IDS") return null;
    throw e;
  });

  if (!result) return { ok: false, error: "The curriculum contains items that belong to another course." };

  // Added/removed lessons change everyone's percentage.
  if (existing && intent !== "autosave") {
    const enrollments = await db.enrollment.findMany({ where: { courseId: result.saved.id, status: "ACTIVE" }, select: { id: true } });
    for (const e of enrollments) await recomputeProgress(e.id);
  }

  // Autosaves fire every few seconds; keep them out of the audit trail.
  if (intent !== "autosave" || !existing) {
    await audit({
      actorId: adminId,
      action: !existing ? "course.create" : intent === "publish" ? "course.publish" : intent === "unpublish" ? "course.unpublish" : "course.update",
      targetType: "course",
      targetId: result.saved.id,
      meta: { slug: result.saved.slug, status: result.saved.status },
    });
  }

  return {
    ok: true,
    course: { id: result.saved.id, slug: result.saved.slug, status: result.saved.status, updatedAt: result.saved.updatedAt.toISOString(), slugChanged: result.slugChanged },
  };
}
