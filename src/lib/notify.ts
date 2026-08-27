import "server-only";
import { db } from "@/lib/db";

export type NotificationType =
  | "signup"
  | "enrollment"
  | "payment_received"
  | "payment_failed"
  | "review"
  | "contact_submission"
  | "course_completed"
  | "certificate_issued";

/**
 * Stub notification/email layer. Real providers (Resend/Postmark/Africa's
 * Talking, etc.) would replace the console.log below; the admin feed always
 * reads from the Notification table either way.
 */
export async function notify(type: NotificationType, payload: Record<string, unknown>) {
  await db.notification.create({
    data: { type, payload: JSON.stringify(payload) },
  });
  console.log(`[notify:${type}]`, payload);
}

export async function sendStubEmail(to: string, subject: string, body: string) {
  console.log(`[email stub] to=${to} subject="${subject}"\n${body}`);
  await db.notification.create({
    data: {
      type: "email",
      payload: JSON.stringify({ to, subject, body }),
    },
  });
}
