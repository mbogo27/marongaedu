"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/dal";
import { slugify } from "@/lib/format";

export async function saveCategoryAction(categoryId: string | null, formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const slug = slugify(String(formData.get("slug") || "") || name);
  const description = String(formData.get("description") || "") || null;
  const iconUrl = String(formData.get("iconUrl") || "") || null;
  const sortOrder = Number(formData.get("sortOrder") || 0);

  if (categoryId) {
    await db.category.update({ where: { id: categoryId }, data: { name, slug, description, iconUrl, sortOrder } });
  } else {
    await db.category.create({ data: { name, slug, description, iconUrl, sortOrder } });
  }
  revalidatePath("/admin/categories");
}

export async function deleteCategoryAction(categoryId: string) {
  await requireAdmin();
  const count = await db.course.count({ where: { categoryId } });
  if (count > 0) return;
  await db.category.delete({ where: { id: categoryId } }).catch(() => {});
  revalidatePath("/admin/categories");
}
