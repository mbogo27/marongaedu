import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashToken, randomToken } from "@/lib/tokens";
import { getClientIp, getUserAgent } from "@/lib/request";
import {
  REMEMBER_DAYS,
  REMEMBER_PREFIX,
  SESSION_COOKIE,
  SESSION_HOURS,
  SESSION_PREFIX,
} from "@/lib/session-constants";

/**
 * Opaque, DB-backed sessions (spec §3.6). The cookie holds a random token;
 * only its SHA-256 lives in the `Session` table, so a DB leak yields nothing
 * usable. Revoking a session is deleting its row — effective immediately.
 */

export function sessionLifetimeMs(remember: boolean) {
  return remember ? REMEMBER_DAYS * 86_400_000 : SESSION_HOURS * 3_600_000;
}

function cookieSecure() {
  return env.NODE_ENV === "production" || env.APP_URL.startsWith("https://");
}

function rawToken(cookieValue: string | undefined): string | null {
  if (!cookieValue) return null;
  if (cookieValue.startsWith(REMEMBER_PREFIX)) return cookieValue.slice(REMEMBER_PREFIX.length);
  if (cookieValue.startsWith(SESSION_PREFIX)) return cookieValue.slice(SESSION_PREFIX.length);
  return null;
}

export async function createSession(userId: string, opts: { remember: boolean }) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs(opts.remember));
  const [ip, ua] = await Promise.all([getClientIp().catch(() => null), getUserAgent().catch(() => null)]);

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      remember: opts.remember,
      expiresAt,
      ipAddress: ip,
      userAgent: ua?.slice(0, 300),
    },
  });
  await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });

  const store = await cookies();
  store.set(SESSION_COOKIE, `${opts.remember ? REMEMBER_PREFIX : SESSION_PREFIX}${token}`, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    // Remember-me: persistent cookie. Otherwise a browser-session cookie (no expires).
    ...(opts.remember ? { expires: expiresAt } : {}),
  });
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return rawToken(store.get(SESSION_COOKIE)?.value);
}

/** Delete the current session row + cookie. */
export async function deleteSession() {
  const token = await readSessionToken();
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Id of the current request's session row (to keep it when revoking others). */
export async function verifySessionId(): Promise<string | null> {
  const token = await readSessionToken();
  if (!token) return null;
  const s = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, select: { id: true } });
  return s?.id ?? null;
}

/** Revoke every session of a user, optionally keeping one (by id). */
export async function revokeUserSessions(userId: string, exceptSessionId?: string) {
  await db.session.deleteMany({
    where: { userId, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
  });
}

export { SESSION_COOKIE };
