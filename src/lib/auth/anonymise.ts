import "server-only";
import { db } from "@/lib/db";

/**
 * Soft-delete + PII scrub (spec §3.6). Payments and enrollments are kept for
 * accounting; reviews are hidden; the public certificate snapshot is anonymised.
 */
export async function anonymiseUser(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  const certs = await db.certificate.findMany({ where: { enrollment: { userId } }, select: { id: true, snapshot: true } });

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: {
        name: "Deleted user",
        email: `deleted+${userId}@deleted.invalid`,
        avatarUrl: null,
        bio: null,
        notificationPrefs: {},
        deletedAt: new Date(),
      },
    }),
    db.account.deleteMany({ where: { userId } }),
    db.session.deleteMany({ where: { userId } }),
    db.verificationToken.deleteMany({ where: { userId } }),
    db.wishlist.deleteMany({ where: { userId } }),
    db.lessonNote.deleteMany({ where: { userId } }),
    db.subscriber.deleteMany({ where: { email: user.email } }),
    db.review.updateMany({ where: { userId, deletedAt: null }, data: { deletedAt: new Date() } }),
    db.lessonComment.updateMany({ where: { userId }, data: { hiddenAt: new Date() } }),
    ...certs.map((c) =>
      db.certificate.update({
        where: { id: c.id },
        data: { snapshot: { ...(c.snapshot as Record<string, unknown>), learnerName: "Deleted user" } },
      })
    ),
  ]);
}
