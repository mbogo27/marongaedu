"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";

export type CouponState = { ok?: boolean; error?: string } | undefined;

const optInt = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(0).nullable());
const optDate = z.preprocess((v) => (v === "" || v == null ? null : new Date(String(v))), z.date().nullable());

const schema = z
  .object({
    code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/, "Codes may only contain letters, numbers, - and _."),
    discountType: z.enum(["PERCENT", "FIXED"]),
    discountValue: z.coerce.number().int().min(1, "Discount must be at least 1."),
    usageLimit: optInt,
    perUserLimit: optInt,
    startsAt: optDate,
    endsAt: optDate,
  })
  .refine((d) => d.discountType !== "PERCENT" || d.discountValue <= 100, { message: "A percentage discount cannot exceed 100.", path: ["discountValue"] })
  .refine((d) => !d.startsAt || !d.endsAt || d.startsAt <= d.endsAt, { message: "End date must be after the start date.", path: ["endsAt"] });

export async function saveCouponAction(couponId: string | null, _prev: CouponState, formData: FormData): Promise<CouponState> {
  const admin = await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(" ") };
  const data = { ...parsed.data, code: parsed.data.code.toUpperCase(), isActive: formData.get("isActive") === "on" };
  const courseIds = formData.getAll("courseIds").map(String);

  try {
    const coupon = couponId ? await db.coupon.update({ where: { id: couponId }, data }) : await db.coupon.create({ data });
    await db.couponCourse.deleteMany({ where: { couponId: coupon.id } });
    if (courseIds.length) await db.couponCourse.createMany({ data: courseIds.map((courseId) => ({ couponId: coupon.id, courseId })) });
    await audit({ actorId: admin.id, action: couponId ? "coupon.update" : "coupon.create", targetType: "coupon", targetId: coupon.id, meta: { code: coupon.code } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "A coupon with that code already exists." };
    throw e;
  }
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function deleteCouponAction(couponId: string) {
  const admin = await requireAdmin();
  await db.coupon.delete({ where: { id: couponId } }).catch(() => {});
  await audit({ actorId: admin.id, action: "coupon.delete", targetType: "coupon", targetId: couponId });
  revalidatePath("/admin/coupons");
}
