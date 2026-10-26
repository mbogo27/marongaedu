"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { refundPayment } from "@/lib/payments/service";

/** Provider refund → REFUNDED, enrollment revoked, learner emailed, audit-logged (spec §7.3). */
export async function refundPaymentAction(paymentId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const res = await refundPayment(admin.id, paymentId);
  revalidatePath("/admin/payments");
  revalidatePath("/admin/enrollments");
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}
