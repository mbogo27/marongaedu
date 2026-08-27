"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";

export async function saveCouponAction(couponId: string | null, formData: FormData) {
  await requireAdmin();
  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!code) return;

  const discountType = String(formData.get("discountType") || "PERCENT") as "PERCENT" | "FIXED";
  const discountValue = Number(formData.get("discountValue") || 0);
  const usageLimit = formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null;
  const perUserLimit = formData.get("perUserLimit") ? Number(formData.get("perUserLimit")) : null;
  const startsAt = formData.get("startsAt") ? new Date(String(formData.get("startsAt"))) : null;
  const endsAt = formData.get("endsAt") ? new Date(String(formData.get("endsAt"))) : null;
  const isActive = formData.get("isActive") === "on";
  const courseIds = formData.getAll("courseIds").map(String);

  const data = { code, discountType, discountValue, usageLimit, perUserLimit, startsAt, endsAt, isActive };

  const coupon = couponId
    ? await db.coupon.update({ where: { id: couponId }, data })
    : await db.coupon.create({ data });

  await db.couponCourse.deleteMany({ where: { couponId: coupon.id } });
  if (courseIds.length > 0) {
    await db.couponCourse.createMany({ data: courseIds.map((courseId) => ({ couponId: coupon.id, courseId })) });
  }

  revalidatePath("/admin/coupons");
}

export async function deleteCouponAction(couponId: string) {
  await requireAdmin();
  await db.coupon.delete({ where: { id: couponId } }).catch(() => {});
  revalidatePath("/admin/coupons");
}
