/** Progress + sequential-unlock rules (spec §5.3). Pure. */

export function computeProgressPercent(totalLessons: number, completedLessons: number): number {
  if (totalLessons <= 0) return 0;
  return Math.min(100, Math.round((completedLessons / totalLessons) * 100));
}

/** Video counts as watched at ≥ 90% (spec §5.3). */
export const VIDEO_COMPLETE_THRESHOLD = 0.9;

export function isVideoWatched(positionSeconds: number, durationSeconds: number): boolean {
  if (durationSeconds <= 0) return false;
  return positionSeconds / durationSeconds >= VIDEO_COMPLETE_THRESHOLD;
}

/**
 * With `requireSequential`, a lesson is locked until the one before it (in
 * course order) is complete. Returns the set of locked lesson ids. Without it,
 * nothing is locked. Admins/previews bypass this at the call site.
 */
export function lockedLessonIds(
  orderedLessonIds: string[],
  completed: ReadonlySet<string>,
  requireSequential: boolean
): Set<string> {
  const locked = new Set<string>();
  if (!requireSequential) return locked;
  for (let i = 1; i < orderedLessonIds.length; i++) {
    if (!completed.has(orderedLessonIds[i - 1]) || locked.has(orderedLessonIds[i - 1])) {
      locked.add(orderedLessonIds[i]);
    }
  }
  return locked;
}

/** First incomplete lesson, else the first lesson — where "Continue" should land. */
export function nextLessonId(orderedLessonIds: string[], completed: ReadonlySet<string>): string | null {
  return orderedLessonIds.find((id) => !completed.has(id)) ?? orderedLessonIds[0] ?? null;
}
