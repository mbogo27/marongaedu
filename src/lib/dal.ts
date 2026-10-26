import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { Enrollment, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { readSessionToken, sessionLifetimeMs } from "@/lib/session";

/**
 * The real authorization boundary (spec §0.4, §3.9). Middleware/proxy is a
 * convenience; every page loader, server action and route handler that
 * touches protected data calls one of these.
 */

const TOUCH_AFTER_MS = 5 * 60_000;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  bio: string | null;
  emailVerifiedAt: Date | null;
  notificationPrefs: unknown;
  createdAt: Date;
};

export type VerifiedSession = { sessionId: string; user: SessionUser };

/** DB-backed session lookup, cached for the duration of a request. */
export const verifySession = cache(async (): Promise<VerifiedSession | null> => {
  const token = await readSessionToken();
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true, name: true, email: true, role: true, status: true, deletedAt: true,
          avatarUrl: true, bio: true, emailVerifiedAt: true, notificationPrefs: true, createdAt: true,
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const { status, deletedAt, ...user } = session.user;
  if (status !== "ACTIVE" || deletedAt) {
    // Suspended/deleted after login: kill the session now (spec §2).
    await db.session.deleteMany({ where: { userId: session.userId } });
    return null;
  }

  // Sliding expiry, throttled so we don't write on every request.
  if (Date.now() - session.lastActiveAt.getTime() > TOUCH_AFTER_MS) {
    db.session
      .update({
        where: { id: session.id },
        data: { lastActiveAt: new Date(), expiresAt: new Date(Date.now() + sessionLifetimeMs(session.remember)) },
      })
      .catch(() => {});
  }

  return { sessionId: session.id, user };
});

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  return (await verifySession())?.user ?? null;
});

/** Logged-in learner or admin; guests go to /login (with a same-origin return path). */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/login?redirect=${encodeURIComponent(returnTo)}` : "/login");
  }
  return user;
}

/** Admin only. Everyone else (including guests) gets a 404 — don't advertise /admin (spec §3.8). */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") notFound();
  return user;
}

export class VerificationRequiredError extends Error {
  constructor() {
    super("Please verify your email address first.");
    this.name = "VerificationRequiredError";
  }
}

/** For actions gated on a verified email (reviews, certificate download/share). */
export async function requireVerifiedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.emailVerifiedAt) throw new VerificationRequiredError();
  return user;
}

export type CourseAccess =
  | { kind: "admin"; enrollment: Enrollment | null }
  | { kind: "enrolled"; enrollment: Enrollment };

/**
 * Can this user consume the course's paid content? Active enrollment, or admin
 * (all courses, for support). Revoked enrollments lose access immediately
 * (spec §5.2). Returns null for no access — callers decide 404 vs redirect.
 */
export async function getCourseAccess(user: SessionUser, courseId: string): Promise<CourseAccess | null> {
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
  });
  if (user.role === "ADMIN") return { kind: "admin", enrollment };
  if (enrollment && enrollment.status === "ACTIVE") return { kind: "enrolled", enrollment };
  return null;
}

/** Throwing variant for server actions / route handlers. */
export async function requireEnrollment(courseId: string): Promise<{ user: SessionUser; access: CourseAccess }> {
  const user = await requireUser();
  const access = await getCourseAccess(user, courseId);
  if (!access) throw new Error("You are not enrolled in this course.");
  return { user, access };
}

/** For Route Handlers: the admin user, or null (respond 404, never 401/403 — don't advertise /admin). */
export async function getAdminOrNull(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user && user.role === "ADMIN" ? user : null;
}
