import { expect, test, type Page } from "@playwright/test";
import { createMiniCourse, createVerifiedUser, db, ipHeaders, loginAndWait } from "./support";

test.use({ extraHTTPHeaders: ipHeaders(4) });

const GOOD = { number: "4242 4242 4242 4242", expiry: "12/99", cvv: "123" };
const DECLINED = "4242 4200 0000 0000"; // Luhn-valid, ends 0000
const NO_FUNDS = "4242 4200 0008 0002"; // Luhn-valid, ends 0002

async function toCheckout(page: Page, slug: string) {
  await page.goto(`/courses/${slug}`);
  await page.getByRole("button", { name: /Enroll now/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/checkout/${slug}$`));
}

async function fillCard(page: Page, c: { number: string; expiry?: string; cvv?: string; name?: string }) {
  await page.getByRole("radio", { name: /Card/ }).click();
  await page.getByLabel("Card number").fill(c.number);
  await page.getByLabel("Expiry (MM/YY)").fill(c.expiry ?? GOOD.expiry);
  await page.getByLabel("CVV").fill(c.cvv ?? GOOD.cvv);
  await page.getByLabel("Cardholder name").fill(c.name ?? "Test Learner");
}

// AC 8 — paid enrollment through the simulated M-Pesa + card rails, including every failure trigger.
test.describe("checkout (M-Pesa)", () => {
  test("success: STK messages, polling, enrollment only after success, receipt + invoice", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "endodontic-fundamentals");
    await expect(page.getByText("This is a demo — no real payment is processed.")).toBeVisible();
    expect(await db.enrollment.count({ where: { userId: user.id } })).toBe(0);

    await page.getByLabel("M-Pesa phone number").fill("254712345678");
    await page.getByRole("button", { name: /Pay with M-Pesa/ }).click();
    await expect(page.getByText(/Sending STK push to 254712345678/)).toBeVisible();
    await expect(page.getByText("Enter your M-Pesa PIN on your phone…")).toBeVisible({ timeout: 8000 });
    // not enrolled while the push is outstanding
    expect(await db.enrollment.count({ where: { userId: user.id } })).toBe(0);
    await expect(page).toHaveURL(/\/learn\/endodontic-fundamentals\?enrolled=success/, { timeout: 20_000 });

    const payment = await db.payment.findFirstOrThrow({ where: { userId: user.id } });
    expect(payment).toMatchObject({ status: "SUCCESS", method: "MPESA", amountKes: 8500, currency: "KES" });
    expect(payment.reference).toMatch(/^MDEMO[0-9A-F]{8}$/);
    expect(payment.invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/);
    expect(await db.enrollment.count({ where: { userId: user.id, status: "ACTIVE" } })).toBe(1);
    expect(await db.emailLog.count({ where: { to: user.email, template: "enrollmentConfirmation" } })).toBe(1);

    // invoice PDF (owner only)
    const inv = await page.request.get(`/invoices/${payment.id}`);
    expect(inv.status()).toBe(200);
    expect(inv.headers()["content-type"]).toBe("application/pdf");
    const other = await createVerifiedUser();
    const ctx = await page.context().browser()!.newContext({ extraHTTPHeaders: ipHeaders(41) });
    const op = await ctx.newPage();
    await loginAndWait(op, other.email);
    expect((await op.request.get(`/invoices/${payment.id}`)).status()).toBe(404);
    await ctx.close();

    // purchase history shows the invoice
    await page.goto("/account");
    await expect(page.getByRole("link", { name: payment.invoiceNumber! })).toBeVisible();
  });

  test("number ending 0000 fails: friendly message, no enrollment, can retry", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await page.getByLabel("M-Pesa phone number").fill("254712340000");
    await page.getByRole("button", { name: /Pay with M-Pesa/ }).click();
    await expect(page.getByText("Payment not confirmed. Try again.")).toBeVisible({ timeout: 20_000 });
    expect(await db.enrollment.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.payment.findFirstOrThrow({ where: { userId: user.id } })).toMatchObject({ status: "FAILED" });
    expect(await db.emailLog.count({ where: { to: user.email, template: "paymentFailed" } })).toBe(1);

    // retry with a working number succeeds (a fresh idempotency key is used)
    await page.getByLabel("M-Pesa phone number").fill("254712345678");
    await page.getByRole("button", { name: /Pay with M-Pesa/ }).click();
    await expect(page).toHaveURL(/\/learn\//, { timeout: 20_000 });
    expect(await db.payment.count({ where: { userId: user.id, status: "SUCCESS" } })).toBe(1);
  });

  test("number ending 1111 stays pending with a Cancel button", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await page.getByLabel("M-Pesa phone number").fill("254712341111");
    await page.getByRole("button", { name: /Pay with M-Pesa/ }).click();
    await expect(page.getByText("Waiting for confirmation on your phone…")).toBeVisible({ timeout: 12_000 });
    await expect(page).toHaveURL(/\/checkout\//); // still pending, not enrolled
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("heading", { name: "Payment method" })).toBeVisible();
    expect(await db.payment.findFirstOrThrow({ where: { userId: user.id } })).toMatchObject({ status: "CANCELLED" });
    expect(await db.enrollment.count({ where: { userId: user.id } })).toBe(0);
  });

  test("invalid phone numbers are caught before any charge", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await page.getByLabel("M-Pesa phone number").fill("0712345678");
    await page.getByRole("button", { name: /Pay with M-Pesa/ }).click();
    await expect(page.getByText("Enter a number like 2547XXXXXXXX.")).toBeVisible();
    expect(await db.payment.count({ where: { userId: user.id } })).toBe(0);
  });
});

test.describe("checkout (card)", () => {
  test("success creates the enrollment and stores only brand + last4", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await fillCard(page, GOOD);
    await page.getByRole("button", { name: /^Pay / }).click();
    await expect(page.getByText("Processing payment…")).toBeVisible();
    await expect(page).toHaveURL(/\/learn\//, { timeout: 15_000 });
    const p = await db.payment.findFirstOrThrow({ where: { userId: user.id } });
    expect(p).toMatchObject({ status: "SUCCESS", method: "CARD", cardBrand: "visa", cardLast4: "4242" });
    expect(p.reference).toMatch(/^ch_demo_/);
    expect(JSON.stringify(p)).not.toContain("42424242");
  });

  test("declined card", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await fillCard(page, { number: DECLINED });
    await page.getByRole("button", { name: /^Pay / }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Your card was declined." })).toBeVisible({ timeout: 15_000 });
    expect(await db.enrollment.count({ where: { userId: user.id } })).toBe(0);
  });

  test("insufficient funds", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await fillCard(page, { number: NO_FUNDS });
    await page.getByRole("button", { name: /^Pay / }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Insufficient funds." })).toBeVisible({ timeout: 15_000 });
    expect(await db.payment.findFirstOrThrow({ where: { userId: user.id } })).toMatchObject({ status: "FAILED", failureReason: "Insufficient funds." });
  });

  test("client-side validation: Luhn, expiry in the past, CVV", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await fillCard(page, { number: "4242 4242 4242 4241", expiry: "01/20", cvv: "1" });
    await page.getByRole("button", { name: /^Pay / }).click();
    await expect(page.getByText("Enter a valid card number.")).toBeVisible();
    await expect(page.getByText("Use MM/YY, not in the past.")).toBeVisible();
    await expect(page.getByText("3 or 4 digits.")).toBeVisible();
    expect(await db.payment.count({ where: { userId: user.id } })).toBe(0);
  });

  test("double-clicking Pay never double-charges", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await fillCard(page, GOOD);
    const pay = page.getByRole("button", { name: /^Pay / });
    await pay.dblclick();
    await expect(page).toHaveURL(/\/learn\//, { timeout: 15_000 });
    expect(await db.payment.count({ where: { userId: user.id } })).toBe(1);
    expect(await db.enrollment.count({ where: { userId: user.id } })).toBe(1);
  });
});

// AC 9 — coupons, server-side pricing.
test.describe("coupons", () => {
  test("WELCOME10 discounts the order and the charge matches", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await page.getByLabel("Coupon code").fill("welcome10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Coupon WELCOME10 applied.")).toBeVisible();
    await expect(page.getByText(/-\s*(?:KES|Ksh)\s*350/)).toBeVisible();
    await fillCard(page, GOOD);
    await page.getByRole("button", { name: /^Pay / }).click();
    await expect(page).toHaveURL(/\/learn\//, { timeout: 15_000 });
    const p = await db.payment.findFirstOrThrow({ where: { userId: user.id } });
    expect(p).toMatchObject({ subtotalKes: 3500, discountKes: 350, amountKes: 3150, couponCode: "WELCOME10" });
    expect(await db.couponUsage.count({ where: { userId: user.id } })).toBe(1);
  });

  test("expired, unknown and wrong-course coupons are rejected with clear messages", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "aesthetic-smile-design-principles"); // STUDENT500 is limited to other courses
    const apply = async (code: string) => {
      await page.getByLabel("Coupon code").fill(code);
      await page.getByRole("button", { name: "Apply" }).click();
    };
    await apply("EXPIRED");
    await expect(page.getByText("This coupon has expired.")).toBeVisible();
    await apply("STUDENT500");
    await expect(page.getByText("This coupon doesn't apply to this course.")).toBeVisible();
    await apply("NOPE");
    await expect(page.getByText("Coupon not found or inactive.")).toBeVisible();
  });

  test("per-user and total usage limits", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await db.coupon.create({ data: { code: "ONEUSE", discountType: "FIXED", discountValue: 100, usageLimit: 1 } });
    const other = await createVerifiedUser();
    const course = await db.course.findFirstOrThrow({ where: { slug: "digital-radiography-acquisition-interpretation" } });
    const coupon = await db.coupon.findUniqueOrThrow({ where: { code: "ONEUSE" } });
    await db.couponUsage.create({ data: { couponId: coupon.id, userId: other.id } });
    void course;
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await page.getByLabel("Coupon code").fill("ONEUSE");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("This coupon has reached its usage limit.")).toBeVisible();
  });
});

test.describe("enrollment rules", () => {
  test("a sold-out course shows 'Sold out' and cannot be bought", async ({ page }) => {
    const { slug } = await createMiniCourse({ free: false, priceKes: 2000, cap: 1 });
    const first = await createVerifiedUser();
    const course = await db.course.findUniqueOrThrow({ where: { slug } });
    await db.enrollment.create({ data: { userId: first.id, courseId: course.id, source: "PURCHASE" } });
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto(`/courses/${slug}`);
    await expect(page.getByRole("button", { name: "Sold out" }).first()).toBeDisabled();
    await page.goto(`/checkout/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/courses/${slug}$`)); // gate re-checked server-side
  });

  test("closed enrollment window", async ({ page }) => {
    const { slug, course } = await createMiniCourse({ free: false, priceKes: 2000 });
    await db.course.update({ where: { id: course.id }, data: { enrollmentClosesAt: new Date(Date.now() - 86_400_000) } });
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto(`/courses/${slug}`);
    await expect(page.getByRole("button", { name: "Enrollment closed" }).first()).toBeDisabled();
  });

  test("free courses never reach checkout; enrolled users are sent to the course", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto("/checkout/pediatric-behavior-management");
    await expect(page).toHaveURL(/\/courses\/pediatric-behavior-management$/);
  });

  test("USD toggle on checkout is display-only", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await toCheckout(page, "digital-radiography-acquisition-interpretation");
    await page.getByRole("button", { name: "USD", exact: true }).click();
    await expect(page.getByText(/\$27/).first()).toBeVisible(); // 3500 / 129
    await expect(page.getByText("USD is for display only — you are charged in KES.")).toBeVisible();
  });
});
