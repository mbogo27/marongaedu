import "server-only";
import type { Prisma, TokenPurpose, VerificationToken } from "@prisma/client";
import { db } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/tokens";

export const TOKEN_TTL_MS: Record<TokenPurpose, number> = {
  VERIFY_EMAIL: 24 * 3_600_000,
  RESET_PASSWORD: 1 * 3_600_000,
  CHANGE_EMAIL: 24 * 3_600_000,
  ADMIN_INVITE: 72 * 3_600_000,
  NEWSLETTER_OPTIN: 7 * 24 * 3_600_000,
};

/**
 * Create a single-use token and return the RAW value (emailed to the user).
 * Only the SHA-256 is stored. Issuing a new token of the same purpose for the
 * same user/identifier invalidates earlier unused ones.
 */
export async function issueToken(input: {
  purpose: TokenPurpose;
  identifier: string;
  userId?: string | null;
  meta?: Prisma.InputJsonValue;
  ttlMs?: number;
}): Promise<string> {
  const raw = randomToken();
  await db.$transaction([
    db.verificationToken.deleteMany({
      where: {
        purpose: input.purpose,
        usedAt: null,
        ...(input.userId ? { userId: input.userId } : { identifier: input.identifier }),
      },
    }),
    db.verificationToken.create({
      data: {
        purpose: input.purpose,
        identifier: input.identifier,
        userId: input.userId ?? null,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + (input.ttlMs ?? TOKEN_TTL_MS[input.purpose])),
        meta: input.meta,
      },
    }),
  ]);
  return raw;
}

export type TokenState = "valid" | "expired" | "used" | "invalid";

/** Inspect a token without consuming it (e.g. to render the reset form or an error page). */
export async function inspectToken(raw: string | undefined, purpose: TokenPurpose): Promise<{ state: TokenState; token?: VerificationToken }> {
  if (!raw) return { state: "invalid" };
  const token = await db.verificationToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!token || token.purpose !== purpose) return { state: "invalid" };
  if (token.usedAt) return { state: "used", token };
  if (token.expiresAt < new Date()) return { state: "expired", token };
  return { state: "valid", token };
}

/**
 * Atomically consume a token: exactly one caller can ever win (the
 * `usedAt: null` guard is part of the UPDATE), so replays and races fail.
 */
export async function consumeToken(raw: string | undefined, purpose: TokenPurpose): Promise<{ ok: true; token: VerificationToken } | { ok: false; state: TokenState }> {
  if (!raw) return { ok: false, state: "invalid" };
  const hash = hashToken(raw);
  const claimed = await db.verificationToken.updateMany({
    where: { tokenHash: hash, purpose, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) {
    const { state } = await inspectToken(raw, purpose);
    return { ok: false, state: state === "valid" ? "invalid" : state };
  }
  const token = await db.verificationToken.findUniqueOrThrow({ where: { tokenHash: hash } });
  return { ok: true, token };
}
