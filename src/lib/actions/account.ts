"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/dal";
import { deleteSession } from "@/lib/session";
import { saveUpload } from "@/lib/storage";

export type AccountFormState = { error?: string; success?: boolean } | undefined;

export async function updateProfileAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Name is required." };

  const avatarFile = formData.get("avatar") as File | null;
  let avatarUrl: string | undefined;
  if (avatarFile && avatarFile.size > 0) {
    avatarUrl = await saveUpload(avatarFile, "avatars");
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name,
      bio: String(formData.get("bio") || "") || null,
      ...(avatarUrl ? { avatarUrl } : {}),
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function changePasswordAction(_prev: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const user = await requireUser();
  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  const dbUser = await db.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "User not found." };

  const valid = await bcrypt.compare(current, dbUser.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "New passwords do not match." };

  const passwordHash = await bcrypt.hash(next, 10);
  await db.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { success: true };
}

export async function updateNotificationPrefsAction(formData: FormData) {
  const user = await requireUser();
  await db.user.update({
    where: { id: user.id },
    data: {
      notifyEmail: formData.get("notifyEmail") === "on",
      notifyMarketing: formData.get("notifyMarketing") === "on",
    },
  });
  revalidatePath("/dashboard");
}

export async function deleteAccountAction() {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { deletedAt: new Date() } });
  await deleteSession();
  redirect("/");
}
