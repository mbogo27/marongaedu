import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email/send";
import { consumeToken } from "@/lib/auth/verification";

export type VerifyResult = { ok: true } | { ok: false; state: "expired" | "used" | "invalid" };

export async function verifyEmailToken(raw: string | undefined): Promise<VerifyResult> {
  const consumed = await consumeToken(raw, "VERIFY_EMAIL");
  if (!consumed.ok) return { ok: false, state: consumed.state === "valid" ? "invalid" : consumed.state };

  const userId = consumed.token.userId;
  const user = userId ? await db.user.findFirst({ where: { id: userId, deletedAt: null } }) : null;
  if (!user) return { ok: false, state: "invalid" };

  if (!user.emailVerifiedAt) {
    await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    await audit({ actorId: user.id, action: "auth.email_verified", targetType: "user", targetId: user.id });
    await notify("email_verified", { userId: user.id, name: user.name });
    await sendEmail("welcome", user.email, { name: user.name }, { link: "/courses", userId: user.id });
  }
  return { ok: true };
}

