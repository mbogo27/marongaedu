import "server-only";
import { db } from "@/lib/db";

/**
 * Account-linking rule for OAuth providers (spec §3.10), implemented now so
 * enabling Google is a config change:
 *
 *   An OAuth sign-in whose provider-VERIFIED email matches an existing user
 *   links to that user. An unverified provider email never links (otherwise
 *   anyone could claim someone else's account by registering their email at
 *   the provider). No match → a new, already-verified, password-less user.
 *
 * The OAuth redirect/callback handlers themselves are out of scope for this
 * phase; they would call this with the provider profile.
 */
export async function linkOrCreateOAuthUser(profile: {
  providerId: string; // "google"
  providerAccountId: string; // provider's stable subject id
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string | null;
}) {
  const email = profile.email.trim().toLowerCase();

  const existingAccount = await db.account.findUnique({
    where: { providerId_providerAccountId: { providerId: profile.providerId, providerAccountId: profile.providerAccountId } },
    include: { user: true },
  });
  if (existingAccount) return existingAccount.user;

  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    if (!profile.emailVerified) {
      throw new Error("Provider email is not verified; refusing to link to an existing account.");
    }
    await db.account.create({
      data: { userId: user.id, providerId: profile.providerId, providerAccountId: profile.providerAccountId },
    });
    if (!user.emailVerifiedAt) {
      await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }
    return user;
  }

  return db.user.create({
    data: {
      name: profile.name,
      email,
      avatarUrl: profile.avatarUrl ?? null,
      emailVerifiedAt: profile.emailVerified ? new Date() : null,
      accounts: { create: { providerId: profile.providerId, providerAccountId: profile.providerAccountId } },
    },
  });
}
