import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE = "maronga_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function encodedKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  role: "LEARNER" | "ADMIN";
  sessionId: string;
};

async function encrypt(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(encodedKey());
}

async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || typeof payload.sessionId !== "string") return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(userId: string, role: "LEARNER" | "ADMIN") {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const dbSession = await db.session.create({
    data: { userId, expiresAt },
  });

  const token = await encrypt({ userId, role, sessionId: dbSession.id }, expiresAt);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function readSessionCookie(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decrypt(store.get(SESSION_COOKIE)?.value);
}

export async function deleteSession() {
  const payload = await readSessionCookie();
  if (payload?.sessionId) {
    await db.session.delete({ where: { id: payload.sessionId } }).catch(() => {});
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export { SESSION_COOKIE };
