export type VideoLessonContent = { videoUrl: string; captionUrl?: string; transcript?: string };
export type ReadingLessonContent = { html: string };
export type ResourceLessonContent = { label: string; url: string };
export type QuizLessonContent = { instructions?: string };

export function parseLessonContent<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return {} as T;
  }
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
