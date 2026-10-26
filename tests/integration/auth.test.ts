import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { consumeToken, inspectToken, issueToken } from "@/lib/auth/verification";
import { DbRateLimiter } from "@/lib/rate-limit";
import { createCredentialUser, hasPassword, isLastActiveAdmin, setPassword, getCredentialAccount } from "@/lib/auth/users";
import { linkOrCreateOAuthUser } from "@/lib/auth/oauth";
import { anonymiseUser } from "@/lib/auth/anonymise";
import { verifyPassword } from "@/lib/auth/password";
import { hashToken } from "@/lib/tokens";
import { makeUser, resetDb } from "../support/db";

beforeEach(resetDb);

describe("verification tokens", () => {
  it("stores only a hash and is single-use", async () => {
    const user = await makeUser();
    const raw = await issueToken({ purpose: "VERIFY_EMAIL", identifier: user.email, userId: user.id });
    const row = await db.verificationToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.tokenHash).toBe(hashToken(raw));
    expect(row.tokenHash).not.toBe(raw);

    expect((await consumeToken(raw, "VERIFY_EMAIL")).ok).toBe(true);
    const replay = await consumeToken(raw, "VERIFY_EMAIL");
    expect(replay).toEqual({ ok: false, state: "used" });
  });

  it("rejects expired tokens, wrong purposes and garbage", async () => {
    const user = await makeUser();
    const raw = await issueToken({ purpose: "RESET_PASSWORD", identifier: user.email, userId: user.id, ttlMs: -1000 });
    expect(await consumeToken(raw, "RESET_PASSWORD")).toEqual({ ok: false, state: "expired" });

    const raw2 = await issueToken({ purpose: "RESET_PASSWORD", identifier: user.email, userId: user.id });
    expect((await inspectToken(raw2, "VERIFY_EMAIL")).state).toBe("invalid"); // right token, wrong purpose
    expect(await consumeToken("nonsense", "RESET_PASSWORD")).toEqual({ ok: false, state: "invalid" });
    expect(await consumeToken(undefined, "RESET_PASSWORD")).toEqual({ ok: false, state: "invalid" });
  });

  it("invalidates earlier unused tokens when a new one is issued", async () => {
    const user = await makeUser();
    const first = await issueToken({ purpose: "RESET_PASSWORD", identifier: user.email, userId: user.id });
    const second = await issueToken({ purpose: "RESET_PASSWORD", identifier: user.email, userId: user.id });
    expect((await consumeToken(first, "RESET_PASSWORD")).ok).toBe(false);
    expect((await consumeToken(second, "RESET_PASSWORD")).ok).toBe(true);
  });

  it("lets exactly one of two concurrent consumers win", async () => {
    const user = await makeUser();
    const raw = await issueToken({ purpose: "VERIFY_EMAIL", identifier: user.email, userId: user.id });
    const results = await Promise.all([consumeToken(raw, "VERIFY_EMAIL"), consumeToken(raw, "VERIFY_EMAIL"), consumeToken(raw, "VERIFY_EMAIL")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("uses the lifetimes from the spec (24h verify, 1h reset, 72h invite)", async () => {
    const u = await makeUser();
    const t = async (purpose: "VERIFY_EMAIL" | "RESET_PASSWORD" | "ADMIN_INVITE") => {
      await issueToken({ purpose, identifier: u.email, userId: u.id });
      const row = await db.verificationToken.findFirstOrThrow({ where: { purpose, userId: u.id } });
      return Math.round((row.expiresAt.getTime() - Date.now()) / 3_600_000);
    };
    expect(await t("VERIFY_EMAIL")).toBe(24);
    expect(await t("RESET_PASSWORD")).toBe(1);
    expect(await t("ADMIN_INVITE")).toBe(72);
  });
});

describe("db-backed rate limiter", () => {
  it("counts per key, blocks past the limit, and survives a new instance (shared state)", async () => {
    const a = new DbRateLimiter();
    for (let i = 0; i < 5; i++) expect((await a.consume("login:email:x", 5, 900)).blocked).toBe(false);
    const sixth = await a.consume("login:email:x", 5, 900);
    expect(sixth.blocked).toBe(true);
    expect(sixth.retryAfterSec).toBeGreaterThan(0);

    const b = new DbRateLimiter(); // "another server instance"
    expect((await b.peek("login:email:x", 5, 900)).blocked).toBe(true);
    expect((await b.peek("login:email:y", 5, 900)).blocked).toBe(false);

    await b.reset("login:email:x");
    expect((await a.peek("login:email:x", 5, 900)).blocked).toBe(false);
  });

  it("is atomic under concurrency", async () => {
    const l = new DbRateLimiter();
    const results = await Promise.all(Array.from({ length: 10 }, () => l.consume("burst", 100, 60)));
    expect(new Set(results.map((r) => r.count)).size).toBe(10); // 1..10, no lost updates
  });

  it("starts a fresh window after it elapses", async () => {
    const l = new DbRateLimiter();
    await l.consume("w", 1, 60);
    await db.rateLimit.update({ where: { key: "w" }, data: { windowStart: new Date(Date.now() - 61_000) } });
    expect((await l.consume("w", 1, 60)).count).toBe(1);
  });
});

describe("users, credentials and account linking", () => {
  it("creates a credential account keyed by the user id and verifies passwords", async () => {
    const u = await createCredentialUser({ name: "A", email: "a@test.local", password: "correct horse battery" });
    const acct = await getCredentialAccount(u.id);
    expect(acct?.providerAccountId).toBe(u.id);
    expect(acct?.passwordHash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse battery", acct!.passwordHash)).toBe(true);
    expect(await verifyPassword("wrong", acct!.passwordHash)).toBe(false);
    await setPassword(u.id, "another long passphrase");
    expect(await verifyPassword("another long passphrase", (await getCredentialAccount(u.id))!.passwordHash)).toBe(true);
  });

  it("never assumes a password exists (OAuth-only users)", async () => {
    const u = await linkOrCreateOAuthUser({ providerId: "google", providerAccountId: "g-1", email: "G@Test.local", emailVerified: true, name: "G" });
    expect(await hasPassword(u.id)).toBe(false);
    expect(u.emailVerifiedAt).not.toBeNull();
  });

  it("links an OAuth sign-in to an existing user only when the provider email is verified", async () => {
    const existing = await createCredentialUser({ name: "E", email: "e@test.local", password: "long enough password" });
    await expect(linkOrCreateOAuthUser({ providerId: "google", providerAccountId: "g-2", email: "e@test.local", emailVerified: false, name: "E" })).rejects.toThrow(/not verified/);
    const linked = await linkOrCreateOAuthUser({ providerId: "google", providerAccountId: "g-2", email: "e@test.local", emailVerified: true, name: "E" });
    expect(linked.id).toBe(existing.id);
    expect(await db.account.count({ where: { userId: existing.id } })).toBe(2);
    // and a repeat sign-in resolves via the provider id
    expect((await linkOrCreateOAuthUser({ providerId: "google", providerAccountId: "g-2", email: "other@x.y", emailVerified: true, name: "E" })).id).toBe(existing.id);
  });

  it("protects the last active admin", async () => {
    const a = await makeUser({ role: "ADMIN" });
    expect(await isLastActiveAdmin(a.id)).toBe(true);
    const b = await makeUser({ role: "ADMIN" });
    expect(await isLastActiveAdmin(a.id)).toBe(false);
    await db.user.update({ where: { id: b.id }, data: { status: "SUSPENDED" } });
    expect(await isLastActiveAdmin(a.id)).toBe(true); // a suspended admin does not count
    expect(await isLastActiveAdmin((await makeUser()).id)).toBe(false); // learners are never "the last admin"
  });
});

describe("account deletion", () => {
  it("anonymises PII, kills credentials and sessions, hides reviews, keeps payments", async () => {
    const { makeCourse } = await import("../support/db");
    const { course } = await makeCourse();
    const u = await createCredentialUser({ name: "Jane Doe", email: "jane@test.local", password: "long enough password" });
    await db.session.create({ data: { userId: u.id, tokenHash: "h1", expiresAt: new Date(Date.now() + 1e6) } });
    await db.review.create({ data: { userId: u.id, courseId: course.id, rating: 5, text: "great course" } });
    const enrollment = await db.enrollment.create({ data: { userId: u.id, courseId: course.id, source: "PURCHASE" } });
    await db.payment.create({ data: { userId: u.id, courseId: course.id, enrollmentId: enrollment.id, idempotencyKey: "k1", amountKes: 100, method: "CARD", status: "SUCCESS" } });
    await db.certificate.create({ data: { enrollmentId: enrollment.id, code: "DENT-AAAA-BBBB", snapshot: { learnerName: "Jane Doe", courseTitle: "x", completedAt: new Date().toISOString(), instructorName: "i" } } });

    await anonymiseUser(u.id);

    const after = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(after.name).toBe("Deleted user");
    expect(after.email).toBe(`deleted+${u.id}@deleted.invalid`);
    expect(after.deletedAt).not.toBeNull();
    expect(await db.account.count({ where: { userId: u.id } })).toBe(0);
    expect(await db.session.count({ where: { userId: u.id } })).toBe(0);
    expect((await db.review.findFirstOrThrow({ where: { userId: u.id } })).deletedAt).not.toBeNull();
    expect(await db.payment.count({ where: { userId: u.id } })).toBe(1); // kept for accounting
    expect(((await db.certificate.findFirstOrThrow()).snapshot as { learnerName: string }).learnerName).toBe("Deleted user");
  });
});
