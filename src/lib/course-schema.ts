import { z } from "zod";

/**
 * The course editor's wire format (spec §6). Shared by the client editor (for
 * the live publish checklist) and the server action (for authoritative
 * validation). Ids are minted by the client for new rows and reused as the
 * database ids, so autosave is idempotent and existing ids — and with them
 * learner progress, notes and quiz attempts — are never lost on save.
 */

const id = z.string().regex(/^[A-Za-z0-9_-]{6,40}$/, "bad id");

export const attachmentSchema = z.object({
  id: z.string().max(40).optional(),
  kind: z.enum(["file", "link"]),
  label: z.string().trim().min(1).max(200),
  key: z.string().max(300).optional(),
  url: z.string().max(1000).optional(),
  filename: z.string().max(300).optional(),
});

export const optionSchema = z.object({ id, text: z.string().max(500), isCorrect: z.boolean() });

export const questionSchema = z.object({
  id,
  question: z.string().max(1000),
  type: z.enum(["SINGLE", "MULTI", "TRUEFALSE"]),
  explanation: z.string().max(2000).default(""),
  options: z.array(optionSchema).max(12),
});

export const lessonSchema = z.object({
  id,
  title: z.string().trim().min(1, "Lesson title is required").max(200),
  type: z.enum(["VIDEO", "READING", "QUIZ", "RESOURCE"]),
  durationSeconds: z.number().int().min(0).max(24 * 3600),
  isFreePreview: z.boolean(),
  // video
  videoSource: z.enum(["file", "youtube", "vimeo"]).default("file"),
  videoKey: z.string().max(300).default(""),
  videoUrl: z.string().max(1000).default(""),
  captions: z.array(z.object({ label: z.string().max(60), lang: z.string().max(10), key: z.string().max(300) })).max(10).default([]),
  transcript: z.string().max(100_000).default(""),
  // video + reading
  attachments: z.array(attachmentSchema).max(20).default([]),
  // reading
  readingHtml: z.string().max(500_000).default(""),
  // resource
  resource: attachmentSchema.nullable().default(null),
  resourceDescription: z.string().max(2000).default(""),
  // quiz
  quizInstructions: z.string().max(1000).default(""),
  passMark: z.number().int().min(1).max(100).default(70),
  questions: z.array(questionSchema).max(100).default([]),
});

export const moduleSchema = z.object({
  id,
  title: z.string().trim().min(1, "Module title is required").max(200),
  description: z.string().max(2000).default(""),
  lessons: z.array(lessonSchema).max(200),
});

export const coursePayloadSchema = z.object({
  // basics
  title: z.string().trim().min(1, "Title is required").max(200),
  slug: z.string().max(120).default(""),
  subtitle: z.string().max(300).default(""),
  categoryId: z.string().default(""),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ALL_LEVELS"]).default("BEGINNER"),
  language: z.string().max(60).default("English"),
  shortDescription: z.string().max(200).default(""),
  description: z.string().max(500_000).default(""),
  outcomes: z.array(z.string().max(300)).max(20).default([]),
  requirements: z.array(z.string().max(300)).max(20).default([]),
  audience: z.array(z.string().max(300)).max(20).default([]),
  // media
  thumbnailUrl: z.string().max(1000).default(""),
  previewVideoUrl: z.string().max(1000).default(""),
  // pricing
  isFree: z.boolean().default(false),
  priceKes: z.number().int().min(0).max(10_000_000).default(0),
  salePriceKes: z.number().int().min(0).max(10_000_000).nullable().default(null),
  saleEndsAt: z.string().nullable().default(null),
  couponIds: z.array(z.string()).max(100).default([]),
  // seo
  metaTitle: z.string().max(200).default(""),
  metaDescription: z.string().max(400).default(""),
  ogImageUrl: z.string().max(1000).default(""),
  // settings
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  requireSequential: z.boolean().default(false),
  enrollmentCap: z.number().int().min(1).nullable().default(null),
  enrollmentOpensAt: z.string().nullable().default(null),
  enrollmentClosesAt: z.string().nullable().default(null),
  certificateTemplate: z.string().max(60).default("default"),
  // curriculum
  modules: z.array(moduleSchema).max(100).default([]),
});

export type CoursePayload = z.infer<typeof coursePayloadSchema>;
export type LessonPayload = z.infer<typeof lessonSchema>;
export type ModulePayload = z.infer<typeof moduleSchema>;
export type QuestionPayload = z.infer<typeof questionSchema>;

export type ChecklistItem = { id: string; label: string; ok: boolean; required: boolean };

/**
 * Publish checklist (spec §6): title, slug, category, thumbnail and at least
 * one module with a lesson are REQUIRED; the rest are advisory warnings.
 */
export function publishChecklist(p: Pick<CoursePayload, "title" | "slug" | "categoryId" | "thumbnailUrl" | "modules" | "shortDescription" | "isFree" | "priceKes">): ChecklistItem[] {
  const lessons = p.modules.flatMap((m) => m.lessons);
  const quizzesOk = lessons.filter((l) => l.type === "QUIZ").every((l) => l.questions.length > 0 && l.questions.every((q) => q.question.trim() && q.options.some((o) => o.isCorrect) && q.options.filter((o) => o.text.trim()).length >= 2));
  const videosOk = lessons.filter((l) => l.type === "VIDEO").every((l) => (l.videoSource === "file" ? !!l.videoKey : !!l.videoUrl.trim()));
  return [
    { id: "title", label: "Title", ok: p.title.trim().length > 0, required: true },
    { id: "slug", label: "URL slug", ok: p.slug.trim().length > 0, required: true },
    { id: "category", label: "Category", ok: !!p.categoryId, required: true },
    { id: "thumbnail", label: "Thumbnail image", ok: !!p.thumbnailUrl.trim(), required: true },
    { id: "curriculum", label: "At least one module with a lesson", ok: p.modules.some((m) => m.lessons.length > 0), required: true },
    { id: "short", label: "Short description", ok: p.shortDescription.trim().length > 0, required: false },
    { id: "price", label: "Price set (or marked free)", ok: p.isFree || p.priceKes > 0, required: false },
    { id: "videos", label: "Every video lesson has a video", ok: videosOk, required: false },
    { id: "quizzes", label: "Every quiz has valid questions", ok: quizzesOk, required: false },
  ];
}

export type EditorCoupon = { id: string; code: string; restricted: boolean; description: string };

export type EditorInitial = {
  id: string | null;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  payload: CoursePayload;
};

export function emptyPayload(categoryId: string): CoursePayload {
  // Parse with a placeholder title (a blank one is invalid by design), then clear it for the form.
  return { ...coursePayloadSchema.parse({ title: "x", categoryId }), title: "" };
}
