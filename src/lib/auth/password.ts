import "server-only";
import bcrypt from "bcryptjs";
import { COMMON_PASSWORDS } from "@/lib/auth/common-passwords";

const BCRYPT_COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(password, hash);
}

/**
 * A real hash we can compare against when the account doesn't exist, so a
 * missing-account login takes as long as a wrong-password login (no timing
 * oracle for account enumeration).
 */
export const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_COST);

let common: Set<string> | undefined;
function commonPasswords(): Set<string> {
  common ??= new Set(COMMON_PASSWORDS.split("\n"));
  return common;
}

export function isCommonPassword(password: string): boolean {
  const list = commonPasswords();
  const lower = password.toLowerCase();
  if (list.has(lower)) return true;
  // "password1234", "Summer2020!": a common word with trailing digits/symbols bolted on.
  const stem = lower.replace(/[\d!@#$%^&*._-]+$/, "");
  return stem.length >= 4 && stem !== lower && list.has(stem);
}
