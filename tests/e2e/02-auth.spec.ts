import { expect, test, type Page } from "@playwright/test";
import { createVerifiedUser, db, emailCount, ipHeaders, latestEmailLink, login, loginAndWait, PASSWORD, STRONG, uniqueEmail } from "./support";

test.use({ extraHTTPHeaders: ipHeaders(2) });

async function signup(page: Page, name: string, email: string, password = STRONG) {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole("button", { name: "Sign up" }).click();
}

// AC 2 — sign up, verify by email, and no account enumeration.
test.describe("sign up + email verification", () => {
  test("new user: check-inbox page, verification email, link verifies the account", async ({ page }) => {
    const email = uniqueEmail("signup");
    await signup(page, "Ada Learner", email);
    await expect(page).toHaveURL(/\/signup\/check-inbox/);
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();

    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.role).toBe("LEARNER");

    // tokens are stored hashed and the account row carries the password hash, not the user row
    const token = await db.verificationToken.findFirstOrThrow({ where: { userId: user.id, purpose: "VERIFY_EMAIL" } });
    const link = await latestEmailLink(email, "verifyEmail");
    expect(link).toContain("/verify-email?token=");
    expect(link).not.toContain(token.tokenHash);

    await page.goto(link);
    await expect(page.getByRole("heading", { name: "Email verified" })).toBeVisible();
    expect((await db.user.findUniqueOrThrow({ where: { email } })).emailVerifiedAt).not.toBeNull();
    expect(await emailCount(email, "welcome")).toBe(1);

    // single use
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "Link already used" })).toBeVisible();
  });

  test("unverified users see the banner and can request a new link (rate limited to 3/hour)", async ({ page }) => {
    const email = uniqueEmail("banner");
    await signup(page, "Banner Person", email);
    await loginAndWait(page, email, STRONG);
    await page.goto("/dashboard");
    const banner = page.getByRole("status").filter({ hasText: "Verify your email" });
    await expect(banner).toBeVisible();

    const before = await emailCount(email, "verifyEmail");
    await banner.getByRole("button", { name: "Resend verification email" }).click();
    await expect(page.getByText("Verification email sent")).toBeVisible();
    await expect.poll(() => emailCount(email, "verifyEmail")).toBe(before + 1);

    // old link no longer works once a new one is issued
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect(await db.verificationToken.count({ where: { userId: user.id, purpose: "VERIFY_EMAIL", usedAt: null } })).toBe(1);

    for (let i = 0; i < 3; i++) {
      await page.goto("/dashboard");
      const b = page.getByRole("status").filter({ hasText: /Verify your email|Verification email sent|at most 3/ });
      await b.getByRole("button", { name: "Resend verification email" }).click().catch(() => {});
    }
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Resend verification email" }).click();
    await expect(page.getByText(/at most 3 verification emails per hour/)).toBeVisible();
  });

  test("signing up with an existing email reveals nothing and notifies the owner", async ({ page }) => {
    const existing = await createVerifiedUser({ name: "Already Here" });
    await signup(page, "Someone Else", existing.email);
    // identical outcome to a fresh sign-up
    await expect(page).toHaveURL(/\/signup\/check-inbox/);
    await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
    await expect(page.getByText(/already (exists|registered|has an account)|is taken|in use/i)).toHaveCount(0);
    await expect.poll(() => emailCount(existing.email, "signupExisting")).toBe(1);
    expect(await db.user.count({ where: { email: existing.email } })).toBe(1);
    expect((await db.user.findUniqueOrThrow({ where: { email: existing.email } })).name).toBe("Already Here");
    // no session cookie was issued on either path
    expect((await page.context().cookies()).some((c) => c.name === "maronga_session")).toBe(false);
  });

  test("password policy: min 10 chars, common passwords rejected, mismatch caught", async ({ browser }) => {
    // own IP: sign-up is limited to 5 attempts per IP per hour and earlier tests used some
    const ctx = await browser.newContext({ extraHTTPHeaders: ipHeaders(22) });
    const page = await ctx.newPage();
    const email = uniqueEmail("policy");
    await signup(page, "Policy Test", email, "short1");
    await expect(page.getByText(/at least 10 characters/i).first()).toBeVisible();

    await signup(page, "Policy Test", email, "1234567890");
    await expect(page.getByText(/too common/i)).toBeVisible();

    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Mismatch");
    await page.getByLabel("Email address", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(STRONG);
    await page.getByLabel("Confirm password").fill(STRONG + "x");
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page.getByText("Passwords do not match.")).toBeVisible();
    expect(await db.user.count({ where: { email } })).toBe(0);
    await ctx.close();
  });

  test("strength meter responds to input", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Password", { exact: true }).fill("aaaa");
    await expect(page.getByText("Strength: Very weak")).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("correct-Horse-battery-9!");
    await expect(page.getByText(/Strength: (Good|Strong)/)).toBeVisible();
  });
});

// AC 3 — sign in, remember me, sign out, sign out other sessions.
test.describe("sessions", () => {
  test("login, remember-me cookie semantics, logout", async ({ browser }) => {
    const user = await createVerifiedUser();

    const plain = await browser.newContext();
    const p1 = await plain.newPage();
    await login(p1, user.email);
    await expect(p1).toHaveURL(/\/dashboard/);
    const c1 = (await plain.cookies()).find((c) => c.name === "maronga_session")!;
    expect(c1.httpOnly).toBe(true);
    expect(c1.sameSite).toBe("Lax");
    expect(c1.expires).toBe(-1); // browser-session cookie (24h server-side)
    expect(c1.value.startsWith("s.")).toBe(true);

    const remembered = await browser.newContext();
    const p2 = await remembered.newPage();
    await login(p2, user.email, PASSWORD, { remember: true });
    await expect(p2).toHaveURL(/\/dashboard/);
    const c2 = (await remembered.cookies()).find((c) => c.name === "maronga_session")!;
    expect(c2.expires).toBeGreaterThan(Date.now() / 1000 + 25 * 86400); // ~30 days
    expect(c2.value.startsWith("r.")).toBe(true);

    // only hashes live in the DB
    const sessions = await db.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(2);
    expect(sessions.some((s) => c1.value.includes(s.tokenHash))).toBe(false);
    expect(sessions.find((s) => s.remember)).toBeTruthy();

    // sign out
    await p1.getByRole("button", { name: /E2E/ }).click();
    await p1.getByRole("button", { name: "Sign out" }).click();
    await expect(p1).toHaveURL(/\/$/);
    await p1.goto("/dashboard");
    await expect(p1).toHaveURL(/\/login/);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(1);
    await plain.close();
    await remembered.close();
  });

  test("account page lists sessions; 'sign out all other sessions' revokes them", async ({ browser }) => {
    const user = await createVerifiedUser();
    const a = await browser.newContext();
    const b = await browser.newContext();
    const pa = await a.newPage();
    const pb = await b.newPage();
    await loginAndWait(pa, user.email);
    await loginAndWait(pb, user.email);

    await pa.goto("/account");
    await expect(pa.getByText("This device")).toHaveCount(1);
    await pa.getByRole("button", { name: "Sign out of all other sessions" }).click();
    await expect.poll(() => db.session.count({ where: { userId: user.id } })).toBe(1);

    await pb.goto("/dashboard"); // b's session is gone
    await expect(pb).toHaveURL(/\/login/);
    await pa.goto("/dashboard");
    await expect(pa).toHaveURL(/\/dashboard/);
    await a.close();
    await b.close();
  });

  test("wrong credentials give one generic message; redirect param is same-origin only", async ({ page }) => {
    const user = await createVerifiedUser();
    await login(page, user.email, "not-the-password");
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    await login(page, "nobody@e2e.test", "whatever-long-password");
    await expect(page.getByText("Incorrect email or password.")).toBeVisible();

    await page.goto("/login?redirect=https://evil.example/phish");
    await page.getByLabel("Email address", { exact: true }).fill(user.email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/localhost:3100\/dashboard$/);
  });

  test("suspended users cannot log in and are signed out immediately", async ({ browser }) => {
    const user = await createVerifiedUser();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAndWait(page, user.email);
    await db.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/); // existing session no longer valid

    await login(page, user.email);
    await expect(page.getByText("This account is unavailable")).toBeVisible();
    await ctx.close();
  });
});

// AC 4 — forgot/reset password.
test.describe("password reset", () => {
  test("reset sets a new password, revokes all sessions, old password fails, token is single-use", async ({ browser, page }) => {
    const user = await createVerifiedUser();
    const other = await browser.newContext();
    const po = await other.newPage();
    await loginAndWait(po, user.email);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(1);

    await page.goto("/forgot-password");
    await page.getByLabel("Email address", { exact: true }).fill(user.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("If an account exists for that email, we've sent a reset link.")).toBeVisible();

    const link = await latestEmailLink(user.email, "passwordReset");
    await page.goto(link);
    await page.getByLabel("New password", { exact: true }).fill("a-brand-new-passphrase-1");
    await page.getByLabel("Confirm new password").fill("a-brand-new-passphrase-1");
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page).toHaveURL(/\/login\?reset=success/);
    await expect(page.getByText("Password reset. Log in with your new password.")).toBeVisible();

    expect(await db.session.count({ where: { userId: user.id } })).toBe(0); // every session revoked
    await po.goto("/dashboard");
    await expect(po).toHaveURL(/\/login/);
    expect(await emailCount(user.email, "passwordChanged")).toBe(1);

    await login(page, user.email, PASSWORD);
    await expect(page.getByText("Incorrect email or password.")).toBeVisible(); // old password dead
    await login(page, user.email, "a-brand-new-passphrase-1");
    await expect(page).toHaveURL(/\/dashboard/);

    // reused token rejected
    await page.goto(link);
    await expect(page.getByRole("heading", { name: "This link can't be used" })).toBeVisible();
    await expect(page.getByText("already been used")).toBeVisible();
    await other.close();
  });

  test("expired tokens and unknown emails behave identically from the outside", async ({ page }) => {
    const user = await createVerifiedUser();
    await page.goto("/forgot-password");
    await page.getByLabel("Email address", { exact: true }).fill("ghost-account@e2e.test");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("If an account exists for that email, we've sent a reset link.")).toBeVisible();
    expect(await emailCount("ghost-account@e2e.test", "passwordReset")).toBe(0);

    await page.goto("/forgot-password");
    await page.getByLabel("Email address", { exact: true }).fill(user.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText("If an account exists for that email, we've sent a reset link.")).toBeVisible();
    const link = await latestEmailLink(user.email, "passwordReset");
    await db.verificationToken.updateMany({ where: { userId: user.id, purpose: "RESET_PASSWORD" }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await page.goto(link);
    await expect(page.getByText("This reset link has expired.")).toBeVisible();
    await page.goto("/reset-password?token=garbage");
    await expect(page.getByText("This reset link is not valid.")).toBeVisible();
  });
});

// AC 14 — rate limiting; failures land in the audit log.
test.describe("rate limiting + audit", () => {
  test("5 failed logins per email block the 6th attempt (even with the right password) and are audited", async ({ browser }) => {
    const user = await createVerifiedUser();
    const ctx = await browser.newContext({ extraHTTPHeaders: ipHeaders(77) });
    const page = await ctx.newPage();
    for (let i = 0; i < 5; i++) {
      await login(page, user.email, `wrong-password-${i}`);
      await expect(page.getByText("Incorrect email or password.")).toBeVisible();
    }
    await login(page, user.email, PASSWORD);
    await expect(page.getByText(/Too many attempts\. Please try again in/)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);

    expect(await db.auditLog.count({ where: { action: "auth.login_failed", actorId: user.id } })).toBe(5);
    expect(await db.auditLog.count({ where: { action: "auth.login_blocked" } })).toBeGreaterThanOrEqual(1);
    await ctx.close();
  });

  test("forgot-password is limited to 3/hour per email", async ({ browser }) => {
    const user = await createVerifiedUser();
    const ctx = await browser.newContext({ extraHTTPHeaders: ipHeaders(78) });
    const page = await ctx.newPage();
    for (let i = 0; i < 3; i++) {
      await page.goto("/forgot-password");
      await page.getByLabel("Email address", { exact: true }).fill(user.email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      await expect(page.getByText(/we've sent a reset link/)).toBeVisible();
    }
    await page.goto("/forgot-password");
    await page.getByLabel("Email address", { exact: true }).fill(user.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/Too many attempts/)).toBeVisible();
    expect(await emailCount(user.email, "passwordReset")).toBe(3);
    expect(await db.auditLog.count({ where: { action: "auth.reset_blocked" } })).toBeGreaterThanOrEqual(1);
    await ctx.close();
  });

  test("sign-up is limited to 5 per IP per hour", async ({ browser }) => {
    const ctx = await browser.newContext({ extraHTTPHeaders: ipHeaders(79) });
    const page = await ctx.newPage();
    for (let i = 0; i < 5; i++) {
      await signup(page, "Rate Limit", uniqueEmail("rl"));
      await expect(page).toHaveURL(/check-inbox/);
    }
    await signup(page, "Rate Limit", uniqueEmail("rl"));
    await expect(page.getByText(/Too many sign-up attempts/)).toBeVisible();
    await ctx.close();
  });
});

// AC 15 — Google is a config flag away; code never assumes a password exists.
test.describe("google (designed for, not built)", () => {
  test("no Google button while AUTH_GOOGLE_ENABLED=false, and the callback is a documented 501", async ({ page, request }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /Google/ })).toHaveCount(0);
    expect((await request.get("/api/auth/google")).status()).toBe(501);
  });
});
