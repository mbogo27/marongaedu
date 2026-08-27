export type AnalyticsEvent =
  | "course_viewed"
  | "preview_played"
  | "enroll_clicked"
  | "checkout_started"
  | "payment_succeeded"
  | "payment_failed"
  | "lesson_started"
  | "lesson_completed"
  | "course_completed"
  | "certificate_issued";

/**
 * Stub analytics layer — console logs now, swap for GA4/Plausible/PostHog by
 * replacing the body of this one function.
 */
export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}) {
  if (typeof window !== "undefined") {
    console.log(`[analytics] ${event}`, props);
  } else {
    console.log(`[analytics:server] ${event}`, props);
  }
}
