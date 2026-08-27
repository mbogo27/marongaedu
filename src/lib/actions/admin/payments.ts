"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";

export async function refundPaymentAction(paymentId: string) {
  await requireAdmin();
  const existing = await db.payment.findUnique({ where: { id: paymentId } });
  if (!existing) return;

  const enrollmentId = existing.enrollmentId;
  await db.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED", enrollmentId: null } });
  if (enrollmentId) {
    await db.enrollment.delete({ where: { id: enrollmentId } }).catch(() => {});
  }
  revalidatePath("/admin/payments");
  revalidatePath("/admin/enrollments");
}
