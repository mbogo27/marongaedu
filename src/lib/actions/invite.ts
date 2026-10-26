"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createSession } from "@/lib/session";
import { consumeToken } from "@/lib/auth/verification";
import { isCommonPassword } from "@/lib/auth/password";
import { createCredentialUser } from "@/lib/auth/users";
import { notify } from "@/lib/notify";
import { fieldErrors, passwordSchema } from "@/lib/validation";
import { z } from "zod";
import { t } from "@/lib/i18n";

export type InviteState = { error?: string; fieldErrors?: Record<string, string[]> } | undefined;

const schema = z
  .object({ token: z.string().min(10), name: z.string().trim().min(2, t("auth.name_min")).max(100), password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: t("auth.password_mismatch"), path: ["confirmPassword"] });

/**
 * Accept an admin invitation (spec §3.8): single-use token, creates an
 * already-verified admin, signs them in. The role comes from the invitation
 * row, never from the form.
 */
export async function acceptInviteAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const { token, name, password } = parsed.data;
  if (isCommonPassword(password)) return { fieldErrors: { password: [t("auth.password_common")] } };

  const consumed = await consumeToken(token, "ADMIN_INVITE");
  if (!consumed.ok) return { error: "This invitation is invalid, expired or already used." };

  const email = consumed.token.identifier;
  if (await db.user.findFirst({ where: { email, deletedAt: null } })) return { error: "An account with this email already exists." };

  const user = await createCredentialUser({ name, email, password, role: "ADMIN", verified: true });
  await audit({ actorId: user.id, action: "team.invite_accepted", targetType: "user", targetId: user.id, meta: { invitedBy: (consumed.token.meta as { invitedBy?: string } | null)?.invitedBy ?? null } });
  await notify("signup", { userId: user.id, name: user.name, role: "ADMIN" });
  await createSession(user.id, { remember: false });
  redirect("/admin");
}
