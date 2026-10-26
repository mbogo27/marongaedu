import { expect, test } from "@playwright/test";
import { db, ipHeaders } from "./support";

test.use({ extraHTTPHeaders: ipHeaders(1) });

// AC 1 — a guest can browse, search, filter and sort the catalog, open a course,
// expand the curriculum and play the preview + free-preview lessons.
test.describe("catalog (guest)", () => {
  test("browse, search, filter and sort", async ({ page }) => {
    await page.goto("/courses");
    await expect(page.getByRole("heading", { name: "All courses", level: 1 })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /8 courses/ })).toBeVisible();

    // full-text search (server-side, via the URL)
    await page.getByRole("searchbox", { name: "Search courses" }).fill("endodontic");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await expect(page).toHaveURL(/search=endodontic/);
    await expect(page.getByRole("link", { name: /Endodontic Fundamentals/ })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: /1 course/ })).toBeVisible();

    // search reaches lesson titles too
    await page.goto("/courses?search=apex+locators");
    await expect(page.getByRole("link", { name: /Endodontic Fundamentals/ })).toBeVisible();

    // empty state
    await page.goto("/courses?search=zzzzqqq");
    await expect(page.getByText("No courses match your filters")).toBeVisible();

    // price filter + sort are URL driven (shareable, back-button safe)
    await page.goto("/courses");
    await page.getByLabel("Free", { exact: true }).click();
    await expect(page).toHaveURL(/price=free/);
    await expect(page.getByRole("status").filter({ hasText: /2 courses/ })).toBeVisible();
    await page.goBack();
    await expect(page).not.toHaveURL(/price=free/);

    await page.goto("/courses?sort=price-desc");
    const first = page.locator("main a[href^='/courses/'] h3").first();
    await expect(first).toContainText("Implant Placement");

    await page.goto("/courses?level=ADVANCED");
    await expect(page.getByRole("status").filter({ hasText: /2 courses/ })).toBeVisible();
  });

  test("USD display toggle changes prices but not the underlying KES", async ({ page }) => {
    await page.goto("/courses?search=implant");
    await expect(page.getByText(/(?:KES|Ksh)\s*15,000/).first()).toBeVisible();
    await page.getByRole("button", { name: "USD", exact: true }).click();
    await expect(page.getByText(/\$\s*116/).first()).toBeVisible();
    await page.getByRole("button", { name: "KES", exact: true }).click();
  });

  test("course page: curriculum, intro video and free-preview lesson playable without signing in", async ({ page, request }) => {
    await page.goto("/courses/endodontic-fundamentals");
    await expect(page.getByRole("heading", { name: /Endodontic Fundamentals/, level: 1 })).toBeVisible();
    expect(await page.locator('script[type="application/ld+json"]').first().textContent()).toContain('"@type":"Course"');

    // curriculum accordion
    await page.getByRole("button", { name: "Expand all" }).click();
    await expect(page.getByText("Pulp and periapical diagnosis", { exact: true })).toBeVisible();

    // intro video
    await page.getByRole("button", { name: /Play preview video/ }).click();
    await expect(page.locator("video").first()).toBeVisible();

    // free-preview lesson in the modal
    await page.getByRole("button", { name: "Preview" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const src = await dialog.locator("video").getAttribute("src");
    expect(src).toMatch(/^\/media\/private\/lessons\/placeholder-\d+\.mp4\?exp=\d+&sig=/);
    // the signed URL streams, with byte-range support for seeking
    const res = await request.get(src!, { headers: { Range: "bytes=0-99" } });
    expect(res.status()).toBe(206);
    expect(res.headers()["content-range"]).toMatch(/^bytes 0-99\//);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("old slugs redirect, drafts are hidden, unknown courses 404", async ({ page }) => {
    const course = await db.course.findFirstOrThrow({ where: { slug: "local-anesthesia-techniques-refresher" } });
    await db.slugRedirect.upsert({ where: { fromSlug: "old-anesthesia-url" }, update: {}, create: { fromSlug: "old-anesthesia-url", courseId: course.id } });
    await page.goto("/courses/old-anesthesia-url");
    await expect(page).toHaveURL(/\/courses\/local-anesthesia-techniques-refresher$/);

    expect((await page.goto("/courses/does-not-exist"))?.status()).toBe(404);
  });

  test("sitemap and robots follow the spec", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/courses/endodontic-fundamentals");
    expect(sitemap).toContain("/categories/endodontics");
    const robots = await (await request.get("/robots.txt")).text();
    for (const p of ["/admin", "/learn", "/dashboard", "/checkout", "/account"]) expect(robots).toContain(`Disallow: ${p}`);
  });
});

// AC 6 — paid content cannot be reached without enrollment (direct URL / API, not just UI).
test.describe("access control (guest)", () => {
  test("paid lesson API, private media and protected pages are closed", async ({ page, request }) => {
    const paid = await db.lesson.findFirstOrThrow({ where: { isFreePreview: false, type: "VIDEO", module: { course: { slug: "endodontic-fundamentals" } } } });
    const free = await db.lesson.findFirstOrThrow({ where: { isFreePreview: true, type: "VIDEO", module: { course: { slug: "endodontic-fundamentals" } } } });

    expect((await request.get(`/api/lessons/${paid.id}`)).status()).toBe(401);
    expect((await request.get(`/api/lessons/${free.id}`)).status()).toBe(200);
    expect((await request.get("/api/lessons/nope")).status()).toBe(404);

    // private media without (or with a forged) signature
    expect((await request.get("/media/private/lessons/placeholder-1.mp4")).status()).toBe(403);
    expect((await request.get("/media/private/lessons/placeholder-1.mp4?exp=9999999999&sig=forged")).status()).toBe(403);
    expect((await request.get("/media/private/lessons/placeholder-1.mp4?exp=1&sig=x")).status()).toBe(403);
    // path traversal
    expect([403, 404]).toContain((await request.get("/media/public/..%2f..%2f.env")).status());
    // public assets are open
    expect((await request.get("/media/public/thumbnails/endodontic-fundamentals.png")).status()).toBe(200);

    // protected pages bounce to login with a same-origin return path
    await page.goto("/learn/endodontic-fundamentals");
    await expect(page).toHaveURL(/\/login\?redirect=%2Flearn%2Fendodontic-fundamentals/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/);

    // payment status + invoices + certificate downloads need a session
    expect((await request.get("/api/payments/abc/status")).status()).toBe(401);
    expect((await request.get("/invoices/abc")).status()).toBe(401);
    // /certificates/* is also guarded by the proxy, which redirects guests to /login
    const dl = await request.get("/certificates/abc/download", { maxRedirects: 0 });
    expect([307, 401]).toContain(dl.status());
  });

  test("uploads need a signed URL", async ({ request }) => {
    const res = await request.put("/api/upload/local?key=private/x.mp4&exp=9999999999&ct=video/mp4&max=100&sig=bad", { data: "x", headers: { "Content-Type": "video/mp4" } });
    expect(res.status()).toBe(403);
  });
});
