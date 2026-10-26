import "server-only";
import { db } from "@/lib/db";
import { parseLessonContent } from "@/lib/content-types";
import { emptyPayload, type CoursePayload, type EditorCoupon, type EditorInitial, type LessonPayload } from "@/lib/course-schema";
import { formatKes } from "@/lib/format";

/** Everything the course editor needs: categories + coupons + the course (or a blank draft). */
export async function loadEditorData(slug: string | null): Promise<{
  initial: EditorInitial;
  categories: { id: string; name: string }[];
  coupons: EditorCoupon[];
} | null> {
  const [categories, couponRows] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { courses: { select: { courseId: true } } } }),
  ]);

  let initial: EditorInitial;
  let courseId: string | null = null;

  if (slug) {
    const course = await db.course.findFirst({
      where: { slug, deletedAt: null },
      include: {
        outcomes: { orderBy: { sortOrder: "asc" } },
        requirements: { orderBy: { sortOrder: "asc" } },
        audience: { orderBy: { sortOrder: "asc" } },
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
    if (!course) return null;
    courseId = course.id;

    const payload: CoursePayload = {
      title: course.title,
      slug: course.slug,
      subtitle: course.subtitle ?? "",
      categoryId: course.categoryId,
      level: course.level,
      language: course.language,
      shortDescription: course.shortDescription,
      description: course.description,
      outcomes: course.outcomes.map((o) => o.text),
      requirements: course.requirements.map((o) => o.text),
      audience: course.audience.map((o) => o.text),
      thumbnailUrl: course.thumbnailUrl,
      previewVideoUrl: course.previewVideoUrl,
      isFree: course.isFree,
      priceKes: course.priceKes,
      salePriceKes: course.salePriceKes,
      saleEndsAt: course.saleEndsAt?.toISOString().slice(0, 10) ?? null,
      couponIds: couponRows.filter((c) => c.courses.some((cc) => cc.courseId === course.id)).map((c) => c.id),
      metaTitle: course.metaTitle ?? "",
      metaDescription: course.metaDescription ?? "",
      ogImageUrl: course.ogImageUrl ?? "",
      status: course.status,
      isFeatured: course.isFeatured,
      requireSequential: course.requireSequential,
      enrollmentCap: course.enrollmentCap,
      enrollmentOpensAt: course.enrollmentOpensAt?.toISOString().slice(0, 10) ?? null,
      enrollmentClosesAt: course.enrollmentClosesAt?.toISOString().slice(0, 10) ?? null,
      certificateTemplate: course.certificateTemplate,
      modules: course.modules.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description ?? "",
        lessons: m.lessons.map((l): LessonPayload => {
          const base: LessonPayload = {
            id: l.id,
            title: l.title,
            type: l.type,
            durationSeconds: l.durationSeconds,
            isFreePreview: l.isFreePreview,
            videoSource: "file",
            videoKey: "",
            videoUrl: "",
            captions: [],
            transcript: "",
            attachments: [],
            readingHtml: "",
            resource: null,
            resourceDescription: "",
            quizInstructions: "",
            passMark: l.passMark,
            questions: l.quizQuestions.map((q) => ({
              id: q.id,
              question: q.question,
              type: q.type,
              explanation: q.explanation ?? "",
              options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
            })),
          };
          const parsed = parseLessonContent(l.type, l.content);
          if (parsed.type === "VIDEO") {
            return {
              ...base,
              videoSource: parsed.content.source,
              videoKey: parsed.content.key ?? "",
              videoUrl: parsed.content.url ?? "",
              captions: parsed.content.captions,
              transcript: parsed.content.transcript,
              attachments: parsed.content.attachments,
            };
          }
          if (parsed.type === "READING") return { ...base, readingHtml: parsed.content.html, attachments: parsed.content.attachments };
          if (parsed.type === "RESOURCE") return { ...base, resource: parsed.content.resource ?? null, resourceDescription: parsed.content.description };
          return { ...base, quizInstructions: parsed.content.instructions };
        }),
      })),
    };
    initial = { id: course.id, slug: course.slug, status: course.status, payload };
  } else {
    initial = { id: null, slug: "", status: "DRAFT", payload: emptyPayload(categories[0]?.id ?? "") };
  }

  const coupons: EditorCoupon[] = couponRows.map((c) => ({
    id: c.id,
    code: c.code,
    restricted: c.courses.length > 0,
    description: c.discountType === "PERCENT" ? `${c.discountValue}% off` : `${formatKes(c.discountValue)} off`,
  }));

  void courseId;
  return { initial, categories, coupons };
}
