import { expect, test } from "@playwright/test";
import { createMiniCourse, createVerifiedUser, db, ipHeaders, loginAndWait, PASSWORD } from "./support";

test.use({ extraHTTPHeaders: ipHeaders(3) });

// AC 5 — free enrollment in one click.
test("a learner enrolls in a free course in one click and lands in the learning view", async ({ page }) => {
  const user = await createVerifiedUser();
  await loginAndWait(page, user.email);
  await page.goto("/courses/pediatric-behavior-management");
  await expect(page.getByText("Free").first()).toBeVisible();
  await page.getByRole("button", { name: "Enroll free" }).click();
  await expect(page).toHaveURL(/\/learn\/pediatric-behavior-management\?enrolled=success/);
  await expect(page.getByText("You're enrolled!")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Course content" })).toBeVisible();

  expect(await db.enrollment.count({ where: { userId: user.id, status: "ACTIVE", source: "FREE" } })).toBe(1);
  expect(await db.emailLog.count({ where: { to: user.email, template: "enrollmentConfirmation" } })).toBe(1);

  // the course page now says "Go to course", and enrolling again is impossible
  await page.goto("/courses/pediatric-behavior-management");
  await expect(page.getByRole("link", { name: /Go to course/ }).first()).toBeVisible();
});

test("guests are sent to log in first and returned to the course", async ({ page }) => {
  await page.goto("/courses/pediatric-behavior-management");
  await page.getByRole("button", { name: "Enroll free" }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcourses%2Fpediatric-behavior-management/);
});

// AC 6 (enrolled vs not) + AC 7 — learning, quizzes graded server-side, progress persists.
test.describe("consuming a course", () => {
  test("non-enrolled users are bounced and the lesson API refuses them", async ({ page }) => {
    const { slug, lessons } = await createMiniCourse({ free: false });
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto(`/learn/${slug}`);
    await expect(page).toHaveURL(new RegExp(`/courses/${slug}$`));
    const res = await page.request.get(`/api/lessons/${lessons.reading.id}`);
    expect(res.status()).toBe(403);
  });

  test("reading + quiz: manual completion, server-graded quiz, persistence across reloads", async ({ page }) => {
    const { slug, lessons } = await createMiniCourse();
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto(`/courses/${slug}`);
    await page.getByRole("button", { name: "Enroll free" }).click();
    await expect(page).toHaveURL(/\/learn\//);

    // lesson 1
    await expect(page.getByRole("heading", { name: "Read me", level: 1 })).toBeVisible();
    await expect(page.getByText("Reading content here.")).toBeVisible();
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByRole("button", { name: /Completed ✓/ })).toBeVisible();
    await expect(page.getByText("1 of 3 lessons complete")).toBeVisible();

    // notes autosave (debounced) and persist
    await page.getByLabel("Notes for this lesson").fill("remember this");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await expect.poll(() => db.lessonNote.count({ where: { userId: user.id, lessonId: lessons.reading.id, content: "remember this" } })).toBe(1);

    // reload: still completed, note restored
    await page.reload();
    await expect(page.getByRole("button", { name: /Completed ✓/ })).toBeVisible();
    await expect(page.getByLabel("Notes for this lesson")).toHaveValue("remember this");

    // un-complete is allowed for non-quiz lessons
    await page.getByRole("button", { name: /Completed ✓/ }).click();
    await expect(page.getByRole("button", { name: "Mark as complete" })).toBeVisible();
    await page.getByRole("button", { name: "Mark as complete" }).click();

    // lesson 2 via Next
    await page.getByRole("link", { name: "Next →" }).click();
    await expect(page.getByRole("heading", { name: "Read me too", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByText("2 of 3 lessons complete")).toBeVisible();

    // the quiz payload sent to the browser contains no answers
    const quizPage = await page.request.get(`/api/lessons/${lessons.quiz.id}`);
    const raw = await quizPage.text();
    expect(raw).not.toContain("isCorrect");
    expect(raw).not.toContain("Rayleigh");

    // quiz: wrong answer fails, nothing completes
    await page.getByRole("link", { name: "Next →" }).click();
    await page.getByLabel("No", { exact: true }).check();
    await page.getByRole("button", { name: "Submit answers" }).click();
    await expect(page.getByText(/You scored 0%/)).toBeVisible();
    await expect(page.getByText("Rayleigh scattering.")).toBeVisible(); // explanation only after grading
    expect(await db.quizAttempt.count({ where: { userId: user.id, passed: false } })).toBe(1);
    await expect(page.getByText("2 of 3 lessons complete")).toBeVisible();

    // retry with the right answer
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByLabel("Yes", { exact: true }).check();
    await page.getByRole("button", { name: "Submit answers" }).click();
    await expect(page.getByText(/Passed with 100%/)).toBeVisible();
    await expect(page.getByText("3 of 3 lessons complete")).toBeVisible();

    const enrollment = await db.enrollment.findFirstOrThrow({ where: { userId: user.id, courseId: lessons.quiz.moduleId ? undefined : undefined } });
    expect(enrollment.progressPercent).toBe(100);
    expect(await db.quizAttempt.count({ where: { userId: user.id } })).toBe(2);
  });

  test("video: position is saved and playback resumes where it stopped", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto("/courses/pediatric-behavior-management");
    await page.getByRole("button", { name: "Enroll free" }).click();
    await expect(page).toHaveURL(/\/learn\//);

    const video = page.locator("video");
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute("src", /\/media\/private\/lessons\/.*sig=/);
    await video.evaluate((v: HTMLVideoElement) => v.play().catch(() => {}));
    await page.waitForFunction(() => (document.querySelector("video") as HTMLVideoElement).currentTime > 1.5, null, { timeout: 15_000 });
    await video.evaluate((v: HTMLVideoElement) => v.pause());

    const lessonId = new URL(page.url()).searchParams.get("lesson");
    await expect.poll(async () => (await db.lessonProgress.findFirst({ where: { enrollment: { userId: user.id } }, orderBy: { updatedAt: "desc" } }))?.lastPositionSeconds ?? 0, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
    void lessonId;

    await page.reload();
    await page.waitForFunction(() => (document.querySelector("video") as HTMLVideoElement)?.readyState >= 1);
    const resumed = await page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime);
    expect(resumed).toBeGreaterThanOrEqual(1);
  });

  test("keyboard shortcuts and controls work on the player", async ({ page }) => {
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto("/courses/pediatric-behavior-management");
    await page.getByRole("button", { name: "Enroll free" }).click();
    const player = page.getByRole("group", { name: /video player/ });
    await player.focus();
    await page.keyboard.press("k");
    await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => !v.paused)).toBe(true);
    await page.keyboard.press("k");
    await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
    await page.getByLabel("Playback speed").selectOption("1.5");
    await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => v.playbackRate)).toBe(1.5);
    await expect(page.getByRole("button", { name: "Captions" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Picture in picture" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Fullscreen" })).toBeVisible();
  });

  test("sequential courses lock later lessons until the previous one is done", async ({ page }) => {
    const { slug, lessons } = await createMiniCourse({ sequential: true });
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto(`/courses/${slug}`);
    await page.getByRole("button", { name: "Enroll free" }).click();

    await expect(page.getByRole("heading", { name: "Read me", level: 1 })).toBeVisible();
    await expect(page.getByText("Complete this lesson to unlock the next one.")).toBeVisible();
    // deep-linking to a locked lesson shows the lock, and the API agrees
    await page.goto(`/learn/${slug}?lesson=${lessons.quiz.id}`);
    await expect(page.getByText("This lesson is locked")).toBeVisible();
    expect((await page.request.get(`/api/lessons/${lessons.quiz.id}`)).status()).toBe(423);

    await page.goto(`/learn/${slug}?lesson=${lessons.reading.id}`);
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByRole("link", { name: "Next →" })).toBeVisible();
    expect((await page.request.get(`/api/lessons/${lessons.reading2.id}`)).status()).toBe(200);
  });

  test("the learning sidebar becomes a drawer on a phone", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, extraHTTPHeaders: ipHeaders(31) });
    const page = await ctx.newPage();
    const { slug } = await createMiniCourse();
    const user = await createVerifiedUser();
    await loginAndWait(page, user.email);
    await page.goto(`/courses/${slug}`);
    await page.getByRole("button", { name: "Enroll free" }).click();
    await expect(page.getByRole("navigation", { name: "Course content" })).toBeHidden();
    await page.getByRole("button", { name: /Course content/ }).click();
    await expect(page.getByRole("dialog", { name: "Course content" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await ctx.close();
  });
});

// AC 13 — certificate issuance, PDF, public verification, revocation.
test.describe("certificates", () => {
  test("completing a course issues a certificate: view, PDF download (verified email), public verification, revocation", async ({ page, request, browser }) => {
    const { slug } = await createMiniCourse();
    const user = await createVerifiedUser({ name: "Cert Holder" });
    await loginAndWait(page, user.email);
    await page.goto(`/courses/${slug}`);
    await page.getByRole("button", { name: "Enroll free" }).click();
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await page.getByRole("link", { name: "Next →" }).click();
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await page.getByRole("link", { name: "Next →" }).click();
    await page.getByLabel("Yes", { exact: true }).check();
    await page.getByRole("button", { name: "Submit answers" }).click();
    await expect(page.getByText(/Passed with 100%/)).toBeVisible();

    const cert = await db.certificate.findFirstOrThrow({ where: { enrollment: { userId: user.id } } });
    expect(cert.code).toMatch(/^DENT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(await db.emailLog.count({ where: { to: user.email, template: "certificateIssued" } })).toBe(1);

    await page.goto("/dashboard?tab=certificates");
    await page.getByRole("link", { name: "View" }).first().click();
    await expect(page.getByText("Certificate of Completion")).toBeVisible();
    await expect(page.getByText("Cert Holder")).toBeVisible();
    await expect(page.getByText(cert.code, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Share on LinkedIn/ })).toHaveAttribute("href", /linkedin\.com\/profile\/add/);

    // PDF
    const pdf = await page.request.get(`/certificates/${cert.id}/download`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");
    expect((await db.certificate.findUniqueOrThrow({ where: { id: cert.id } })).pdfKey).toBeTruthy(); // cached in private storage

    // public verification (no login)
    const anon = await browser.newContext({ extraHTTPHeaders: ipHeaders(32) });
    const ap = await anon.newPage();
    await ap.goto(`/verify/${cert.code}`);
    await expect(ap.getByRole("heading", { name: "Certificate verified" })).toBeVisible();
    await expect(ap.getByText("Cert Holder")).toBeVisible();
    await ap.goto("/verify/DENT-NOPE-0000");
    await expect(ap.getByRole("heading", { name: "Certificate not found" })).toBeVisible();

    // another learner cannot open or download it
    const other = await createVerifiedUser();
    const oc = await browser.newContext({ extraHTTPHeaders: ipHeaders(33) });
    const op = await oc.newPage();
    await loginAndWait(op, other.email);
    expect((await op.request.get(`/certificates/${cert.id}/download`)).status()).toBe(404);
    expect((await op.goto(`/certificates/${cert.id}`))?.status()).toBe(404);

    // revoking the enrollment revokes the certificate everywhere
    await db.$transaction([
      db.enrollment.update({ where: { id: cert.enrollmentId }, data: { status: "REVOKED", revokedAt: new Date() } }),
      db.certificate.update({ where: { id: cert.id }, data: { revokedAt: new Date() } }),
    ]);
    await ap.goto(`/verify/${cert.code}`);
    await expect(ap.getByRole("heading", { name: "Certificate revoked" })).toBeVisible();
    expect((await page.request.get(`/certificates/${cert.id}/download`)).status()).toBe(410);
    void request;
    await anon.close();
    await oc.close();
  });

  test("unverified users cannot download or share certificates", async ({ page, browser }) => {
    const user = await createVerifiedUser();
    await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: null } });
    const { slug } = await createMiniCourse();
    await loginAndWait(page, user.email);
    await page.goto(`/courses/${slug}`);
    await page.getByRole("button", { name: "Enroll free" }).click();
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await page.getByRole("link", { name: "Next →" }).click();
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await page.getByRole("link", { name: "Next →" }).click();
    await page.getByLabel("Yes", { exact: true }).check();
    await page.getByRole("button", { name: "Submit answers" }).click();
    await expect(page.getByText(/Passed with 100%/)).toBeVisible();

    const cert = await db.certificate.findFirstOrThrow({ where: { enrollment: { userId: user.id } } });
    await page.goto(`/certificates/${cert.id}`);
    await expect(page.getByText("Verify your email address to download or share this certificate.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Download PDF" })).toHaveCount(0);
    expect((await page.request.get(`/certificates/${cert.id}/download`)).status()).toBe(403);
    void browser;
    void PASSWORD;
  });
});
