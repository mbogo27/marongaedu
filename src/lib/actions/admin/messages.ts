"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";

export async function markMessageReadAction(id: string) {
  await requireAdmin();
  await db.contactSubmission.update({ where: { id }, data: { status: "READ" } });
  revalidatePath("/admin/messages");
}

export async function markMessageRepliedAction(id: string) {
  await requireAdmin();
  await db.contactSubmission.update({ where: { id }, data: { status: "REPLIED" } });
  revalidatePath("/admin/messages");
}

export async function markNotificationReadAction(id: string) {
  await requireAdmin();
  await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  revalidatePath("/admin/notifications");
}
