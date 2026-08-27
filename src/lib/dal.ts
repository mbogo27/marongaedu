import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readSessionCookie } from "@/lib/session";

/**
 * Real (DB-backed) session check — the actual authorization boundary.
 * Cached per request so repeated calls during a render pass are free.
 */
export const verifySession = cache(async () => {
  const payload = await readSessionCookie();
  if (!payload) return null;

  const dbSession = await db.session.findUnique({ where: { id: payload.sessionId } });
  if (!dbSession || dbSession.expiresAt < new Date()) return null;

  db.session
    .update({ where: { id: dbSession.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  return { userId: payload.userId, role: payload.role, sessionId: payload.sessionId };
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      bio: true,
      verifiedAt: true,
      notifyEmail: true,
      notifyMarketing: true,
      createdAt: true,
    },
  });
  return user;
});

/** Use in Server Components/pages that require a logged-in learner or admin. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use in Server Components/pages/actions that require the admin role. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/admin/login");
  return user;
}
