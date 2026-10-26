"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { issueToken } from "@/lib/auth/verification";
import { isLastActiveAdmin } from "@/lib/auth/users";
import { revokeUserSessions } from "@/lib/session";
import { sendEmail } from "@/lib/email/send";
import { getRateLimiter } from "@/lib/rate-limit";
import { emailSchema } from "@/lib/validation";
import { t } from "@/lib/i18n";

export type TeamState = { ok?: boolean; error?: string; message?: string } | undefined;
type Result = { ok: boolean; error?: string };

export async function inviteAdminAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const admin = await requireAdmin();
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: t("auth.email_invalid") };
  const email = parsed.data;

  const rl = await getRateLimiter().consume(`invite:${admin.id}`, 20, 3600);
  if (rl.blocked) return { error: t("auth.too_many_attempts", { wait: "a while" }) };

  const existing = await db.user.findFirst({ where: { email, deletedAt: null } });
  if (existing) {
    return { error: existing.role === "ADMIN" ? "That person is already an admin." : "That email already has an account. Use “Promote” below instead of an invitation." };
  }

  const token = await issueToken({ purpose: "ADMIN_INVITE", identifier: email, meta: { invitedBy: admin.id, invitedByName: admin.name } });
  await sendEmail("adminInvite", email, { inviter: admin.name }, { link: `/invite?token=${token}` });
  await audit({ actorId: admin.id, action: "team.invite", targetType: "invite", targetId: email });
  revalidatePath("/admin/settings/team");
  return { ok: true, message: `Invitation sent to ${email}. The link works once and expires in 72 hours.` };
}

export async function cancelInviteAction(tokenId: string): Promise<Result> {
  const admin = await requireAdmin();
  await db.verificationToken.deleteMany({ where: { id: tokenId, purpose: "ADMIN_INVITE", usedAt: null } });
  await audit({ actorId: admin.id, action: "team.invite_cancelled", targetType: "invite", targetId: tokenId });
  revalidatePath("/admin/settings/team");
  return { ok: true };
}

export async function promoteUserAction(_prev: TeamState, formData: FormData): Promise<TeamState> {
  const admin = await requireAdmin();
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: t("auth.email_invalid") };
  const user = await db.user.findFirst({ where: { email: parsed.data, deletedAt: null } });
  if (!user) return { error: "No account with that email." };
  if (user.role === "ADMIN") return { error: "Already an admin." };
  if (user.status !== "ACTIVE") return { error: "That account is suspended." };
  if (!user.emailVerifiedAt) return { error: "That account has not verified its email yet." };

  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await audit({ actorId: admin.id, action: "team.promote", targetType: "user", targetId: user.id });
  revalidatePath("/admin/settings/team");
  return { ok: true, message: `${user.name} is now an admin.` };
}

async function guardTarget(adminId: string, userId: string): Promise<string | null> {
  if (userId === adminId) return t("auth.cannot_self");
  if (await isLastActiveAdmin(userId)) return t("auth.last_admin");
  return null;
}

export async function demoteAdminAction(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  const err = await guardTarget(admin.id, userId);
  if (err) return { ok: false, error: err };
  await db.user.update({ where: { id: userId }, data: { role: "LEARNER" } });
  await audit({ actorId: admin.id, action: "team.demote", targetType: "user", targetId: userId });
  revalidatePath("/admin/settings/team");
  return { ok: true };
}

export async function suspendAdminAction(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  const err = await guardTarget(admin.id, userId);
  if (err) return { ok: false, error: err };
  await db.user.update({ where: { id: userId }, data: { status: "SUSPENDED" } });
  await revokeUserSessions(userId);
  await audit({ actorId: admin.id, action: "team.suspend", targetType: "user", targetId: userId });
  revalidatePath("/admin/settings/team");
  return { ok: true };
}

export async function unsuspendAdminAction(userId: string): Promise<Result> {
  const admin = await requireAdmin();
  await db.user.update({ where: { id: userId }, data: { status: "ACTIVE" } });
  await audit({ actorId: admin.id, action: "team.unsuspend", targetType: "user", targetId: userId });
  revalidatePath("/admin/settings/team");
  return { ok: true };
}
