import "server-only";
import { randomUUID } from "node:crypto";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export const CREDENTIAL = "credential";

/** Create a user with an email/password credential account. Email must already be normalised. */
export async function createCredentialUser(input: {
  name: string;
  email: string;
  password: string;
  role?: Role;
  verified?: boolean;
  passwordHash?: string;
}) {
  const passwordHash = input.passwordHash ?? (await hashPassword(input.password));
  // Credential accounts use the user id as providerAccountId, so mint the id up front.
  const id = randomUUID();
  return db.user.create({
    data: {
      id,
      name: input.name,
      email: input.email,
      role: input.role ?? "LEARNER",
      emailVerifiedAt: input.verified ? new Date() : null,
      accounts: { create: { providerId: CREDENTIAL, providerAccountId: id, passwordHash } },
    },
  });
}

export function getCredentialAccount(userId: string) {
  return db.account.findUnique({
    where: { providerId_providerAccountId: { providerId: CREDENTIAL, providerAccountId: userId } },
  });
}

/** Does this user have a password? OAuth-only users don't (spec §3.10). */
export async function hasPassword(userId: string): Promise<boolean> {
  const a = await getCredentialAccount(userId);
  return !!a?.passwordHash;
}

/** Set (or add) the credential password. */
export async function setPassword(userId: string, password: string) {
  const passwordHash = await hashPassword(password);
  await db.account.upsert({
    where: { providerId_providerAccountId: { providerId: CREDENTIAL, providerAccountId: userId } },
    update: { passwordHash },
    create: { userId, providerId: CREDENTIAL, providerAccountId: userId, passwordHash },
  });
}

export function countActiveAdmins() {
  return db.user.count({ where: { role: "ADMIN", status: "ACTIVE", deletedAt: null } });
}

/** True if removing admin capability from `userId` would leave no active admin. */
export async function isLastActiveAdmin(userId: string): Promise<boolean> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { role: true, status: true, deletedAt: true } });
  if (!u || u.role !== "ADMIN" || u.status !== "ACTIVE" || u.deletedAt) return false;
  return (await countActiveAdmins()) <= 1;
}
