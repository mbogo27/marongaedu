import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type NotificationType =
  | "signup"
  | "email_verified"
  | "enrollment"
  | "payment_received"
  | "payment_failed"
  | "refund"
  | "review"
  | "contact_submission"
  | "course_completed"
  | "certificate_issued"
  | "email"
  | "email_failed"
  | "security";

/**
 * Admin notifications feed (`/admin/notifications`). Emails go through
 * `sendEmail` (src/lib/email/send.ts); this table records platform events
 * for the instructor regardless of which email provider is configured.
 */
export async function notify(type: NotificationType, payload: Prisma.InputJsonObject) {
  await db.notification.create({ data: { type, payload } });
}
