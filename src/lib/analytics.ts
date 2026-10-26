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
  | "certificate_issued"
  | "signup_completed"
  | "email_verified"
  | "login"
  | "quiz_submitted";

export interface AnalyticsAdapter {
  track(event: AnalyticsEvent, props: Record<string, unknown>): void;
}

/** Default adapter: structured console line. */
const consoleAdapter: AnalyticsAdapter = {
  track(event, props) {
    const where = typeof window === "undefined" ? "server" : "client";
    console.log(`[analytics:${where}] ${event}`, props);
  },
};

// Swap by ANALYTICS_PROVIDER. PostHog / Plausible / GA4 adapters implement
// AnalyticsAdapter and register here (browser SDK snippets belong in the root
// layout); until their keys are configured every provider falls back to the
// console adapter so events are never lost silently in dev.
const adapters: Record<string, AnalyticsAdapter> = {
  console: consoleAdapter,
  posthog: consoleAdapter,
  plausible: consoleAdapter,
  ga4: consoleAdapter,
};

export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}) {
  const name = process.env.ANALYTICS_PROVIDER ?? "console";
  (adapters[name] ?? consoleAdapter).track(event, props);
}
