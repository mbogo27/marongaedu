"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { slugify } from "@/lib/format";

export type CategoryState = { ok?: boolean; error?: string } | undefined;

export async function saveCategoryAction(categoryId: string | null, _prev: CategoryState, formData: FormData): Promise<CategoryState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  if (!name) return { error: "Name is required." };
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const description = String(formData.get("description") ?? "").trim().slice(0, 500) || null;
  const iconUrl = String(formData.get("iconUrl") ?? "").trim().slice(0, 1000) || null;
  const sortOrder = Math.round(Number(formData.get("sortOrder") ?? 0)) || 0;

  try {
    const cat = categoryId
      ? await db.category.update({ where: { id: categoryId }, data: { name, slug, description, iconUrl, sortOrder } })
      : await db.category.create({ data: { name, slug, description, iconUrl, sortOrder } });
    await audit({ actorId: admin.id, action: categoryId ? "category.update" : "category.create", targetType: "category", targetId: cat.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { error: "Another category already uses that slug." };
    throw e;
  }
  revalidatePath("/admin/categories");
  revalidatePath("/courses");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCategoryAction(categoryId: string): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdmin();
  const count = await db.course.count({ where: { categoryId } });
  if (count > 0) return { ok: false, error: "This category still has courses." };
  await db.category.delete({ where: { id: categoryId } }).catch(() => {});
  await audit({ actorId: admin.id, action: "category.delete", targetType: "category", targetId: categoryId });
  revalidatePath("/admin/categories");
  return { ok: true };
}
