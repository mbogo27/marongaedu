import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createMiniCourse, createVerifiedUser, db, ipHeaders, loginAndWait } from "./support";

test.use({ extraHTTPHeaders: ipHeaders(6) });

// AC 16 — axe: no serious/critical issues on the key pages, usable at 360px, keyboard operable.
async function axe(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const summary = bad.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`).join("\n");
  expect(bad, `${label}\n${summary}`).toEqual([]);
}

async function noHorizontalScroll(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `${label} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1);
}

const PUBLIC_PAGES: [string, string][] = [
  ["home", "/"],
  ["catalog", "/courses"],
  ["course detail", "/courses/endodontic-fundamentals"],
  ["category", "/categories/endodontics"],
  ["login", "/login"],
  ["signup", "/signup"],
  ["forgot password", "/forgot-password"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["faq", "/faq"],
  ["terms", "/terms"],
];

test.describe("axe (desktop)", () => {
  for (const [label, url] of PUBLIC_PAGES) {
    test(label, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator("main")).toBeVisible();
      await axe(page, label);
    });
  }

  test("checkout, learn, dashboard, account", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto("/dashboard");
    await axe(page, "dashboard");
    await page.goto("/account");
    await axe(page, "account");
    await page.goto("/checkout/digital-radiography-acquisition-interpretation");
    await axe(page, "checkout (mpesa)");
    await page.getByRole("radio", { name: /Card/ }).click();
    await axe(page, "checkout (card)");

    const { slug } = await createMiniCourse();
    await page.goto(`/courses/${slug}`);
    await page.getByRole("button", { name: "Enroll free" }).click();
    await expect(page.getByRole("navigation", { name: "Course content" })).toBeVisible();
    await axe(page, "learn (reading)");
    await page.goto("/courses/pediatric-behavior-management");
    await page.getByRole("button", { name: "Enroll free" }).click();
    await expect(page.locator("video")).toBeVisible();
    await axe(page, "learn (video)");
  });

  test("admin: dashboard, course editor (every tab), lists", async ({ page }) => {
    await loginAndWait(page, "admin@demo.co.ke");
    for (const url of ["/admin", "/admin/courses", "/admin/students", "/admin/payments", "/admin/enrollments", "/admin/coupons", "/admin/reviews", "/admin/settings", "/admin/settings/team", "/admin/audit"]) {
      await page.goto(url);
      await axe(page, url);
    }
    await page.goto("/admin/courses/endodontic-fundamentals");
    for (const tab of ["basics", "media", "curriculum", "pricing", "seo", "settings"]) {
      await page.getByRole("tab", { name: tab }).click();
      await axe(page, `course editor › ${tab}`);
    }
  });
});

test.describe("360px viewport", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  for (const [label, url] of PUBLIC_PAGES) {
    test(`${label} has no horizontal scroll`, async ({ page }) => {
      await page.goto(url);
      await noHorizontalScroll(page, label);
    });
  }

  test("catalog filters open as a drawer; sticky enroll bar appears on scroll", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.getByRole("complementary", { name: "Filters" })).toBeHidden();
    await page.getByRole("button", { name: "Filters" }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.goto("/courses/endodontic-fundamentals");
    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect(page.getByText("Enroll now").last()).toBeVisible();
  });

  test("authenticated pages fit the viewport", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    for (const url of ["/dashboard", "/account", "/checkout/digital-radiography-acquisition-interpretation"]) {
      await page.goto(url);
      await noHorizontalScroll(page, url);
    }
    await page.goto("/courses/pediatric-behavior-management");
    await page.getByRole("button", { name: "Enroll free" }).click();
    await noHorizontalScroll(page, "learn");
  });

  test("admin shell adapts (mobile nav, tables scroll inside their container)", async ({ page }) => {
    await loginAndWait(page, "admin@demo.co.ke");
    for (const url of ["/admin", "/admin/courses", "/admin/students", "/admin/payments"]) {
      await page.goto(url);
      await noHorizontalScroll(page, url);
    }
    await page.goto("/admin/courses/endodontic-fundamentals");
    await noHorizontalScroll(page, "course editor");
  });
});

test.describe("keyboard", () => {
  test("skip link, visible focus and a full keyboard login", async ({ page }) => {
    const user = await createVerifiedUser();
    await page.goto("/login");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.getByLabel("Email address", { exact: true }).focus();
    // focus ring is rendered
    const outline = await page.getByLabel("Email address", { exact: true }).evaluate((el) => getComputedStyle(el).outlineStyle + getComputedStyle(el).boxShadow);
    expect(outline).not.toBe("none");
    await page.keyboard.type(user.email);
    await page.keyboard.press("Tab");
    await page.keyboard.type("Demo@1234");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("curriculum accordion and preview modal are keyboard operable", async ({ page }) => {
    await page.goto("/courses/endodontic-fundamentals");
    const mod = page.getByRole("button", { name: /Access and Working Length/ });
    await mod.focus();
    await page.keyboard.press("Enter");
    await expect(mod).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Enter");
    await expect(mod).toHaveAttribute("aria-expanded", "false");

    await page.getByRole("button", { name: "Preview", exact: true }).first().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("quiz is answerable by keyboard", async ({ page }) => {
    const { slug } = await createMiniCourse();
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto(`/courses/${slug}`);
    await page.getByRole("button", { name: "Enroll free" }).click();
    await expect(page.getByRole("navigation", { name: "Course content" })).toBeVisible();
    const quiz = await db.lesson.findFirstOrThrow({ where: { type: "QUIZ", module: { course: { slug } } } });
    await page.goto(`/learn/${slug}?lesson=${quiz.id}`);
    await page.getByLabel("Yes", { exact: true }).focus();
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Submit answers" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/Passed with 100%/)).toBeVisible();
  });
});

test("security headers and CSP nonce on pages", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["strict-transport-security"]).toContain("max-age=");
  const csp = h["content-security-policy"];
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
  expect(csp).not.toContain("'unsafe-eval'");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("the app runs under the CSP without violations", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (m) => {
    if (/Content Security Policy|Refused to/.test(m.text())) violations.push(m.text());
  });
  page.on("pageerror", (e) => violations.push(`pageerror: ${e.message}`));
  await page.goto("/");
  await page.goto("/courses");
  await page.goto("/courses/endodontic-fundamentals");
  await page.getByRole("button", { name: /Play preview video/ }).click();
  await page.goto("/login");
  await page.goto("/signup");
  const user = await createVerifiedUser();
  await loginAndWait(page, user.email);
  await page.goto("/dashboard");
  await page.goto("/courses/pediatric-behavior-management");
  await page.getByRole("button", { name: "Enroll free" }).click();
  await expect(page.locator("video")).toBeVisible();
  expect(violations).toEqual([]);
});
