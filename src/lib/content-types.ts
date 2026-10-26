import { z } from "zod";

/**
 * Lesson `content` is stored as jsonb; its shape depends on `Lesson.type`
 * (spec §8, §10). Zod schemas double as the parser for DB reads and the
 * validator for admin saves. Private file references are STORAGE KEYS, never
 * URLs — URLs are signed on demand after an access check.
 */

const attachmentSchema = z.object({
  label: z.string().max(200),
  kind: z.enum(["file", "link"]),
  key: z.string().optional(), // storage key (private/…) when kind = file
  url: z.string().optional(), // external URL when kind = link
  filename: z.string().optional(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

const captionSchema = z.object({
  label: z.string().max(60),
  lang: z.string().max(10),
  key: z.string(),
});
export type CaptionTrack = z.infer<typeof captionSchema>;

export const videoContentSchema = z.object({
  source: z.enum(["file", "youtube", "vimeo"]).default("file"),
  /** Storage key when source = file. */
  key: z.string().optional(),
  /** Public watch URL when source = youtube | vimeo. */
  url: z.string().optional(),
  captions: z.array(captionSchema).default([]),
  transcript: z.string().default(""),
  attachments: z.array(attachmentSchema).default([]),
});
export type VideoLessonContent = z.infer<typeof videoContentSchema>;

export const readingContentSchema = z.object({
  html: z.string().default(""),
  attachments: z.array(attachmentSchema).default([]),
});
export type ReadingLessonContent = z.infer<typeof readingContentSchema>;

export const resourceContentSchema = z.object({
  resource: attachmentSchema.optional(),
  description: z.string().default(""),
});
export type ResourceLessonContent = z.infer<typeof resourceContentSchema>;

export const quizContentSchema = z.object({
  instructions: z.string().default(""),
});
export type QuizLessonContent = z.infer<typeof quizContentSchema>;

export type LessonType = "VIDEO" | "READING" | "QUIZ" | "RESOURCE";

export type ParsedContent =
  | { type: "VIDEO"; content: VideoLessonContent }
  | { type: "READING"; content: ReadingLessonContent }
  | { type: "RESOURCE"; content: ResourceLessonContent }
  | { type: "QUIZ"; content: QuizLessonContent };

/** Parse a DB `Json` value for a lesson type, falling back to safe defaults. */
export function parseLessonContent(type: LessonType, raw: unknown): ParsedContent {
  const value = raw ?? {};
  switch (type) {
    case "VIDEO":
      return { type, content: videoContentSchema.catch(videoContentSchema.parse({})).parse(value) };
    case "READING":
      return { type, content: readingContentSchema.catch(readingContentSchema.parse({})).parse(value) };
    case "RESOURCE":
      return { type, content: resourceContentSchema.catch(resourceContentSchema.parse({})).parse(value) };
    case "QUIZ":
      return { type, content: quizContentSchema.catch(quizContentSchema.parse({})).parse(value) };
  }
}

/** Extract an embeddable URL from a YouTube / Vimeo watch link. */
export function toEmbedUrl(source: "youtube" | "vimeo", url: string): string | null {
  try {
    const u = new URL(url);
    if (source === "youtube") {
      const id = u.hostname.includes("youtu.be") ? u.pathname.slice(1) : u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : null;
    }
    const id = u.pathname.split("/").filter(Boolean).pop();
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  } catch {
    return null;
  }
}

/** Guess a source type from a pasted URL (admin editor convenience). */
export function detectVideoSource(url: string): "youtube" | "vimeo" | null {
  if (/(?:youtube\.com|youtu\.be)/i.test(url)) return "youtube";
  if (/vimeo\.com/i.test(url)) return "vimeo";
  return null;
}

export const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  ALL_LEVELS: "All levels",
};

export function levelLabel(level: string) {
  return LEVEL_LABELS[level] ?? level;
}

export type PlayableVideo = { source: "file" | "youtube" | "vimeo"; src: string };

/**
 * Resolve a stored/pasted video reference (course intro video) to something
 * playable: YouTube/Vimeo links become embeds, everything else is a file URL.
 */
export function resolveVideoReference(value: string | null | undefined): PlayableVideo | null {
  if (!value) return null;
  const kind = detectVideoSource(value);
  if (kind) {
    const embed = toEmbedUrl(kind, value);
    return embed ? { source: kind, src: embed } : null;
  }
  return { source: "file", src: value };
}
