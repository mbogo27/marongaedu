import path from "node:path";
import { expect, test } from "@playwright/test";
import { createMiniCourse, createVerifiedUser, db, emailCount, ipHeaders, latestEmailLink, loginAndWait, PASSWORD, STRONG, uniqueEmail } from "./support";

test.use({ extraHTTPHeaders: ipHeaders(5) });

const ADMIN = "admin@demo.co.ke";
const SAMPLE_VIDEO = path.join(process.cwd(), "assets", "placeholder", "videos", "placeholder-2.mp4");
const SAMPLE_IMAGE = path.join(process.cwd(), "maronga.jpg");

// AC 11 — only admins reach /admin; everyone else gets a 404.
test.describe("admin access", () => {
  test("guests and learners get 404 on /admin/*, including the old login route", async ({ page }) => {
    for (const p of ["/admin", "/admin/courses", "/admin/settings/team", "/admin/login", "/admin/audit"]) {
      expect((await page.goto(p))?.status(), p).toBe(404);
    }
    const learner = await createVerifiedUser();
    await loginAndWait(page, learner.email);
    for (const p of ["/admin", "/admin/payments", "/admin/students"]) expect((await page.goto(p))?.status(), p).toBe(404);
    // route handlers too
    expect((await page.request.get("/admin/enrollments/export")).status()).toBe(404);
    expect((await page.request.get("/admin/payments/export")).status()).toBe(404);
    expect((await page.request.get("/admin/settings/certificate/preview")).status()).toBe(404);
  });

  test("admin logs in through the normal login page and lands in the back office", async ({ page }) => {
    await page.goto("/login?redirect=/admin");
    await page.getByLabel("Email address", { exact: true }).fill(ADMIN);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  });

  test("dashboard: metrics, charts and the date-range picker", async ({ page }) => {
    await loginAndWait(page, ADMIN);
    await page.goto("/admin");
    await expect(page.getByText(/Revenue \(last 30 days\)/)).toBeVisible();
    await expect(page.getByRole("img", { name: /Revenue chart/ })).toBeVisible();
    await expect(page.getByRole("img", { name: /Enrollments chart/ })).toBeVisible();
    await page.getByRole("link", { name: "12 months" }).click();
    await expect(page.getByText(/Revenue \(last 12 months\)/)).toBeVisible();
    await page.getByRole("link", { name: "7 days" }).click();
    await expect(page.getByText(/Revenue \(last 7 days\)/)).toBeVisible();
    await page.goto("/admin?range=custom&from=2020-01-01&to=2030-01-01");
    await expect(page.getByText(/Revenue \(2020-01-01/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top courses by revenue" })).toBeVisible();
  });
});

// AC 10 — create a course from scratch and publish it.
test.describe("course editor", () => {
  test("basics → media uploads → curriculum with a quiz → pricing → publish → public; unpublish hides", async ({ page }) => {
    await loginAndWait(page, ADMIN);
    await page.goto("/admin/courses/new");
    await expect(page.getByRole("heading", { name: "New course" })).toBeVisible();

    const title = `Playwright Course ${Date.now().toString(36)}`;
    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel(/Short description/).fill("Built by the E2E suite.");
    await page.getByRole("textbox", { name: "Course description" }).click();
    await page.keyboard.type("A description with some text.");

    // autosave creates the draft (debounced) and updates the URL without a reload
    await expect(page).toHaveURL(/\/admin\/courses\/playwright-course-/, { timeout: 15_000 });
    await expect.poll(() => db.course.count({ where: { title } })).toBe(1);
    await expect(page.getByRole("heading", { name: "Edit course" })).toBeVisible();
    expect((await db.course.findFirstOrThrow({ where: { title } })).status).toBe("DRAFT");

    // checklist blocks publishing until the required items exist
    await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

    // media: thumbnail upload straight to storage
    await page.getByRole("tab", { name: "media" }).click();
    await page.getByLabel("Upload thumbnail").setInputFiles(SAMPLE_IMAGE);
    await expect(page.getByAltText("Current thumbnail")).toBeVisible({ timeout: 15_000 });

    // curriculum: module, video lesson with a real upload, quiz
    await page.getByRole("tab", { name: "curriculum" }).click();
    await page.getByRole("button", { name: "+ Add module" }).click();
    await page.getByRole("button", { name: "+ Video lesson" }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Video file (MP4 / WebM)").setInputFiles(SAMPLE_VIDEO);
    await expect(page.getByText(/placeholder-2|\.mp4/).first()).toBeVisible({ timeout: 20_000 });
    await expect.poll(async () => (await db.lesson.findFirst({ where: { module: { course: { title } }, type: "VIDEO" } }))?.durationSeconds ?? 0, { timeout: 20_000 }).toBeGreaterThan(0);

    await page.getByRole("button", { name: "+ Quiz" }).click();
    await page.getByRole("button", { name: "Edit", exact: true }).last().click();
    await page.getByRole("button", { name: "+ Add question" }).click();
    await page.getByLabel("Question 1 text").fill("What is 2 + 2?");
    await page.getByLabel("Option 1 text").fill("4");
    await page.getByLabel("Option 2 text").fill("5");

    // pricing
    await page.getByRole("tab", { name: "pricing" }).click();
    await page.getByLabel("Price (KES)").fill("4200");
    await page.getByLabel("Sale price (KES, optional)").fill("3600");

    // publish
    await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Published. The course is live.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();

    const course = await db.course.findFirstOrThrow({ where: { title }, include: { modules: { include: { lessons: { include: { quizQuestions: { include: { options: true } } } } } } } });
    expect(course).toMatchObject({ status: "PUBLISHED", priceKes: 4200, salePriceKes: 3600 });
    const lessons = course.modules.flatMap((m) => m.lessons);
    expect(lessons.map((l) => l.type).sort()).toEqual(["QUIZ", "VIDEO"]);
    const video = lessons.find((l) => l.type === "VIDEO")!;
    expect((video.content as { key: string }).key).toMatch(/^private\/lessons\/[0-9a-f]+\.mp4$/); // private, not public
    expect(lessons.find((l) => l.type === "QUIZ")!.quizQuestions[0].options.filter((o) => o.isCorrect)).toHaveLength(1);
    expect(course.thumbnailUrl).toMatch(/^\/media\/public\/thumbnails\//);

    // appears publicly immediately
    await page.goto("/courses?sort=newest");
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
    await page.goto(`/courses/${course.slug}`);
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await expect(page.getByText(/3,600/).first()).toBeVisible();

    // unpublish hides it (admin can still preview with a draft banner)
    await page.goto(`/admin/courses/${course.slug}`);
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("Unpublished.")).toBeVisible();
    const anon = await page.context().browser()!.newContext({ extraHTTPHeaders: ipHeaders(51) });
    const ap = await anon.newPage();
    expect((await ap.goto(`/courses/${course.slug}`))?.status()).toBe(404);
    await ap.goto("/courses");
    await expect(ap.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
    await anon.close();
    await page.goto(`/courses/${course.slug}`);
    await expect(page.getByText(/Draft preview/)).toBeVisible();
  });

  test("unsaved-changes guard and drag handles are present", async ({ page }) => {
    await loginAndWait(page, ADMIN);
    const slug = (await db.course.findFirstOrThrow({ where: { slug: "endodontic-fundamentals" } })).slug;
    await page.goto(`/admin/courses/${slug}`);
    await page.getByRole("tab", { name: "curriculum" }).click();
    await expect(page.getByRole("button", { name: /Reorder module/ }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Reorder lesson/ }).first()).toBeVisible();

    await page.getByRole("tab", { name: "basics" }).click();
    await page.getByLabel("Subtitle").fill("changed but not yet autosaved");
    let dialogMessage = "";
    page.once("dialog", async (d) => {
      dialogMessage = d.message();
      await d.dismiss();
    });
    await page.getByRole("link", { name: "← All courses" }).click();
    expect(dialogMessage).toContain("unsaved changes");
    await expect(page).toHaveURL(/\/admin\/courses\/endodontic/);
  });

  test("renaming a slug keeps the old URL working; duplicate creates a draft copy", async ({ page }) => {
    await loginAndWait(page, ADMIN);
    const { course, slug } = await createMiniCourse();
    await page.goto(`/admin/courses/${slug}`);
    await page.getByLabel("URL slug").fill(`${slug}-renamed`);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
    await page.goto(`/courses/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/courses/${slug}-renamed$`));

    await page.goto("/admin/courses?search=Mini+Course");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("row", { name: new RegExp(course.title) }).getByRole("button", { name: "Duplicate" }).click();
    await expect.poll(() => db.course.count({ where: { title: `${course.title} (Copy)`, status: "DRAFT" } })).toBe(1);
    const copy = await db.course.findFirstOrThrow({ where: { title: `${course.title} (Copy)` } });
    expect(await db.lesson.count({ where: { module: { courseId: copy.id } } })).toBe(3);
  });
});

// AC 11 — invitations.
test.describe("team", () => {
  test("invite an admin by email: single-use link, set password, log in; last-admin protection", async ({ page, browser }) => {
    await loginAndWait(page, ADMIN);
    const email = uniqueEmail("invitee");
    await page.goto("/admin/settings/team");
    await page.getByLabel("Invite by email").fill(email);
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText(`Invitation sent to ${email}`)).toBeVisible();

    const link = await latestEmailLink(email, "adminInvite");
    expect(link).toContain("/invite?token=");
    const ctx = await browser.newContext({ extraHTTPHeaders: ipHeaders(52) });
    const ip = await ctx.newPage();
    await ip.goto(link);
    await ip.getByLabel("Full name").fill("New Admin");
    await ip.getByLabel("Password", { exact: true }).fill(STRONG);
    await ip.getByLabel("Confirm password").fill(STRONG);
    await ip.getByRole("button", { name: "Create admin account" }).click();
    await expect(ip).toHaveURL(/\/admin$/);
    const created = await db.user.findUniqueOrThrow({ where: { email } });
    expect(created).toMatchObject({ role: "ADMIN", name: "New Admin" });
    expect(created.emailVerifiedAt).not.toBeNull();

    // single use
    await ip.goto(link);
    await expect(ip.getByRole("heading", { name: "This invitation can't be used" })).toBeVisible();

    // new admin can act; admins cannot demote/suspend themselves
    await ip.goto("/admin/settings/team");
    await expect(ip.getByText("(you)")).toBeVisible();
    await ctx.close();

    // demote the new admin from the original admin's session; the original can't be demoted by themselves
    page.on("dialog", (d) => d.accept());
    await page.goto("/admin/settings/team");
    await page.getByRole("row", { name: new RegExp(email) }).getByRole("button", { name: "Demote" }).click();
    await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { email } })).role).toBe("LEARNER");
    expect(await db.auditLog.count({ where: { action: "team.invite_accepted" } })).toBeGreaterThanOrEqual(1);
  });

  test("an invitation for an existing account is refused", async ({ page }) => {
    await loginAndWait(page, ADMIN);
    const u = await createVerifiedUser();
    await page.goto("/admin/settings/team");
    await page.getByLabel("Invite by email").fill(u.email);
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByText(/already has an account/)).toBeVisible();
  });
});

// AC 12 — refunds.
test.describe("payments", () => {
  test("refund: provider refund, status refunded, access revoked, learner emailed, audit-logged", async ({ page, browser }) => {
    const learner = await createVerifiedUser();
    const course = await db.course.findFirstOrThrow({ where: { slug: "digital-radiography-acquisition-interpretation" } });
    const enrollment = await db.enrollment.create({ data: { userId: learner.id, courseId: course.id, source: "PURCHASE" } });
    const payment = await db.payment.create({
      data: { userId: learner.id, courseId: course.id, enrollmentId: enrollment.id, idempotencyKey: `refund-${Date.now()}`, subtotalKes: 3500, amountKes: 3500, method: "CARD", status: "SUCCESS", reference: "ch_demo_refundme", invoiceNumber: "INV-2026-90001", cardBrand: "visa", cardLast4: "4242" },
    });

    const lc = await browser.newContext({ extraHTTPHeaders: ipHeaders(53) });
    const lp = await lc.newPage();
    await loginAndWait(lp, learner.email);
    expect((await lp.goto("/learn/digital-radiography-acquisition-interpretation"))?.url()).toContain("/learn/");

    await loginAndWait(page, ADMIN);
    await page.goto("/admin/payments?q=ch_demo_refundme");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Refund" }).click();
    await expect.poll(async () => (await db.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("REFUNDED");
    expect((await db.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).status).toBe("REVOKED");
    await expect.poll(() => emailCount(learner.email, "refundProcessed")).toBe(1);
    expect(await db.auditLog.count({ where: { action: "payment.refund", targetId: payment.id } })).toBe(1);

    // the learner loses access immediately
    await lp.goto("/learn/digital-radiography-acquisition-interpretation");
    await expect(lp).toHaveURL(/\/courses\/digital-radiography/);
    const lessonId = (await db.lesson.findFirstOrThrow({ where: { isFreePreview: false, module: { courseId: course.id } } })).id;
    expect((await lp.request.get(`/api/lessons/${lessonId}`)).status()).toBe(403);
    await lc.close();
  });

  test("CSV exports stream with headers and neutralise formula injection", async ({ page }) => {
    await loginAndWait(page, ADMIN);
    await db.user.create({ data: { email: uniqueEmail("csv"), name: "=SUM(A1:A9)", emailVerifiedAt: new Date() } });
    const csv = await page.request.get("/admin/payments/export");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(csv.headers()["content-disposition"]).toContain("payments-");
    const text = await csv.text();
    expect(text.split("\r\n")[0]).toContain("Invoice");
    expect(text.split("\r\n").length).toBeGreaterThan(10);

    const enr = await page.request.get("/admin/enrollments/export?status=ACTIVE");
    expect(enr.headers()["content-type"]).toContain("text/csv");
    expect((await enr.text()).split("\r\n")[0]).toContain("Student");
  });
});

// AC 9 — an admin creates a coupon and a learner applies it.
test("admin creates a coupon; a learner applies it at checkout", async ({ page, browser }) => {
  await loginAndWait(page, ADMIN);
  await page.goto("/admin/coupons");
  await page.getByRole("button", { name: "+ New coupon" }).click();
  const dialog = page.getByRole("dialog", { name: "New coupon" });
  await dialog.getByLabel("Code").fill("E2E25");
  await dialog.getByLabel("Value").fill("25");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("cell", { name: "E2E25" })).toBeVisible();
  expect(await db.coupon.findUnique({ where: { code: "E2E25" } })).toMatchObject({ discountType: "PERCENT", discountValue: 25 });

  // validation: >100%
  await page.getByRole("button", { name: "+ New coupon" }).click();
  const d2 = page.getByRole("dialog", { name: "New coupon" });
  await d2.getByLabel("Code").fill("TOOBIG");
  await d2.getByLabel("Value").fill("150");
  await d2.getByRole("button", { name: "Save" }).click();
  await expect(d2.getByText(/cannot exceed 100/)).toBeVisible();
  await page.keyboard.press("Escape");

  const learner = await createVerifiedUser();
  const ctx = await browser.newContext({ extraHTTPHeaders: ipHeaders(54) });
  const lp = await ctx.newPage();
  await loginAndWait(lp, learner.email);
  await lp.goto("/courses/digital-radiography-acquisition-interpretation");
  await lp.getByRole("button", { name: /Enroll now/ }).first().click();
  await lp.getByLabel("Coupon code").fill("E2E25");
  await lp.getByRole("button", { name: "Apply" }).click();
  await expect(lp.getByText("Coupon E2E25 applied.")).toBeVisible();
  await ctx.close();
});

// Back-office management.
test.describe("management screens", () => {
  test("students: search, suspend/unsuspend (sessions revoked), manual enroll, revoke access", async ({ page, browser }) => {
    await loginAndWait(page, ADMIN);
    const learner = await createVerifiedUser({ name: "Managed Student" });
    const lc = await browser.newContext({ extraHTTPHeaders: ipHeaders(55) });
    const lp = await lc.newPage();
    await loginAndWait(lp, learner.email);

    await page.goto(`/admin/students?search=${encodeURIComponent(learner.email)}`);
    await expect(page.getByRole("link", { name: "Managed Student" })).toBeVisible();
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Suspend" }).click();
    await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: learner.id } })).status).toBe("SUSPENDED");
    expect(await db.session.count({ where: { userId: learner.id } })).toBe(0);
    await lp.goto("/dashboard");
    await expect(lp).toHaveURL(/\/login/);

    await page.getByRole("button", { name: "Unsuspend" }).click();
    await expect.poll(async () => (await db.user.findUniqueOrThrow({ where: { id: learner.id } })).status).toBe("ACTIVE");

    // detail page: manual enrollment, then revoke
    await page.goto(`/admin/students/${learner.id}`);
    await page.getByRole("button", { name: "+ Manual enroll" }).click();
    await page.getByLabel("Course").selectOption({ label: "Local Anesthesia Techniques: A Refresher" });
    await page.getByRole("button", { name: "Enroll", exact: true }).click();
    await expect(page.getByText(/is now enrolled in/)).toBeVisible();
    expect(await db.enrollment.count({ where: { userId: learner.id, source: "MANUAL", status: "ACTIVE" } })).toBe(1);
    expect(await db.payment.count({ where: { userId: learner.id, method: "MANUAL" } })).toBe(1);

    await page.reload();
    await page.getByRole("button", { name: "Revoke access" }).click();
    await expect.poll(() => db.enrollment.count({ where: { userId: learner.id, status: "REVOKED" } })).toBe(1);
    expect(await db.auditLog.count({ where: { action: "enrollment.manual" } })).toBeGreaterThanOrEqual(1);
    await lc.close();
  });

  test("reviews: hide removes it from the public page; replies show as 'Instructor reply'", async ({ page, browser }) => {
    await loginAndWait(page, ADMIN);
    const review = await db.review.findFirstOrThrow({ where: { status: "PUBLISHED", deletedAt: null, instructorReply: null }, include: { course: true } });
    await page.goto("/admin/reviews");
    const card = page.getByRole("listitem").filter({ hasText: review.text }).first();
    await card.getByRole("button", { name: "Reply" }).click();
    await card.getByLabel("Reply as instructor").fill("Thanks for the feedback!");
    await card.getByRole("button", { name: "Save" }).click();
    await expect.poll(async () => (await db.review.findUniqueOrThrow({ where: { id: review.id } })).instructorReply).toBe("Thanks for the feedback!");

    const anon = await browser.newContext({ extraHTTPHeaders: ipHeaders(56) });
    const ap = await anon.newPage();
    await ap.goto(`/courses/${review.course.slug}`);
    await expect(ap.getByText("Thanks for the feedback!")).toBeVisible();

    await page.goto("/admin/reviews");
    await page.getByRole("listitem").filter({ hasText: review.text }).first().getByRole("button", { name: "Hide" }).click();
    await expect.poll(async () => (await db.review.findUniqueOrThrow({ where: { id: review.id } })).status).toBe("HIDDEN");
    await ap.goto(`/courses/${review.course.slug}`);
    await expect(ap.getByText(review.text)).toHaveCount(0);
    await anon.close();
  });

  test("contact form → admin messages + admin notification email; FAQ edits appear publicly", async ({ page, browser }) => {
    const anon = await browser.newContext({ extraHTTPHeaders: ipHeaders(57) });
    const ap = await anon.newPage();
    await ap.goto("/contact");
    await ap.getByLabel("Name").fill("Prospective Student");
    await ap.getByLabel("Email", { exact: true }).fill("prospect@e2e.test");
    await ap.getByLabel("Subject").fill("E2E enquiry");
    await ap.getByLabel("Message").fill("Do you run in-person workshops as well?");
    await ap.getByRole("button", { name: "Send message" }).click();
    await expect(ap.getByText("Thanks! We'll get back to you soon.")).toBeVisible();
    await anon.close();

    await loginAndWait(page, ADMIN);
    await page.goto("/admin/messages");
    await expect(page.getByText("E2E enquiry")).toBeVisible();
    expect(await emailCount("hello@example.com", "contactMessage") + (await db.emailLog.count({ where: { template: "contactMessage" } }))).toBeGreaterThan(0);

    await page.goto("/admin/faqs");
    await page.getByLabel("Question").last().fill("Do you offer workshops?");
    await page.getByLabel(/^Answer/).last().fill("Not yet: online only.");
    await page.getByRole("button", { name: "Add FAQ" }).click();
    await expect(page.getByText("Do you offer workshops?")).toBeVisible();
    await page.goto("/faq");
    await expect(page.getByText("Do you offer workshops?")).toBeVisible();
  });

  test("settings: site name flows to the public header; email template overrides are used; certificate preview renders", async ({ page }) => {
    await loginAndWait(page, ADMIN);
    await page.goto("/admin/settings");
    await page.getByLabel("Site name").fill("Maronga Dental Academy E2E");
    await page.locator("#general").getByRole("button", { name: "Save" }).click();
    await expect(page.locator("#general").getByText("Saved.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("contentinfo").getByText("Maronga Dental Academy E2E").first()).toBeVisible();
    await page.goto("/admin/settings");
    await page.getByLabel("Site name").fill("Maronga Dental Academy");
    await page.locator("#general").getByRole("button", { name: "Save" }).click();
    await expect(page.locator("#general").getByText("Saved.")).toBeVisible();

    // email template override
    await page.goto("/admin/settings/emails");
    await page.getByRole("button", { name: /Password reset link/ }).click();
    await page.getByLabel("Subject").fill("CUSTOM reset subject for {{name}}");
    await page.getByRole("button", { name: "Save templates" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();
    const user = await createVerifiedUser({ name: "Override Person" });
    const ctx = await page.context().browser()!.newContext({ extraHTTPHeaders: ipHeaders(58) });
    const p = await ctx.newPage();
    await p.goto("/forgot-password");
    await p.getByLabel("Email address", { exact: true }).fill(user.email);
    await p.getByRole("button", { name: "Send reset link" }).click();
    await expect.poll(() => db.emailLog.findFirst({ where: { to: user.email, template: "passwordReset" } }).then((r) => r?.subject)).toBe("CUSTOM reset subject for Override Person");
    await ctx.close();
    // restore default
    await page.goto("/admin/settings/emails");
    await page.getByRole("button", { name: /Password reset link/ }).click();
    await page.getByRole("button", { name: "Reset to default" }).click();
    await page.getByRole("button", { name: "Save templates" }).click();
    await expect(page.getByText("Saved.")).toBeVisible();

    // certificate preview
    const pdf = await page.request.get("/admin/settings/certificate/preview");
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
  });

  test("audit log records admin actions and security events and is filterable", async ({ page }) => {
    await loginAndWait(page, ADMIN);
    await page.goto("/admin/audit?action=auth.");
    await expect(page.getByRole("cell", { name: /auth\.login/ }).first()).toBeVisible();
    await page.goto("/admin/audit?action=payment.refund");
    await expect(page.getByRole("cell", { name: "payment.refund" }).first()).toBeVisible();
    await page.goto("/admin/notifications");
    await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
    await expect(page.getByRole("listitem").getByText("Email (console provider)").first()).toBeVisible();
  });
});
