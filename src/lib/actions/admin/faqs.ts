"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { sanitizeRichText } from "@/lib/sanitize";

export type FaqState = { ok?: boolean; error?: string } | undefined;

export async function saveFaqAction(faqId: string | null, _prev: FaqState, formData: FormData): Promise<FaqState> {
  const admin = await requireAdmin();
  const question = String(formData.get("question") ?? "").trim().slice(0, 300);
  const answer = sanitizeRichText(String(formData.get("answer") ?? "").trim().slice(0, 5000));
  if (!question || !answer) return { error: "Question and answer are required." };

  if (faqId) {
    await db.faq.update({ where: { id: faqId }, data: { question, answer } });
  } else {
    const last = await db.faq.findFirst({ orderBy: { sortOrder: "desc" } });
    await db.faq.create({ data: { question, answer, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  }
  await audit({ actorId: admin.id, action: faqId ? "faq.update" : "faq.create", targetType: "faq", targetId: faqId ?? undefined });
  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
  return { ok: true };
}

export async function deleteFaqAction(faqId: string) {
  const admin = await requireAdmin();
  await db.faq.delete({ where: { id: faqId } }).catch(() => {});
  await audit({ actorId: admin.id, action: "faq.delete", targetType: "faq", targetId: faqId });
  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
}

export async function moveFaqAction(faqId: string, direction: "up" | "down") {
  await requireAdmin();
  const all = await db.faq.findMany({ orderBy: { sortOrder: "asc" } });
  const i = all.findIndex((f) => f.id === faqId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;
  const reordered = [...all];
  [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
  await db.$transaction(reordered.map((f, idx) => db.faq.update({ where: { id: f.id }, data: { sortOrder: idx } })));
  revalidatePath("/admin/faqs");
  revalidatePath("/faq");
}
