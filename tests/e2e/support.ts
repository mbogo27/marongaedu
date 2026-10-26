import { expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { E2E_DB } from "../../playwright.config";

export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: E2E_DB }) });
export const PASSWORD = "Demo@1234";
export const STRONG = "tr0ub4dor-&-three-horses";

let counter = 0;
/** A unique email per call so tests never collide with seed data or each other. */
export function uniqueEmail(prefix = "e2e") {
  counter += 1;
  return `${prefix}.${Date.now().toString(36)}.${counter}@e2e.test`;
}

/** Give each spec file its own client IP so per-IP rate limits (signup 5/h, login 20/15m) don't interact. */
export function ipHeaders(n: number) {
  return { "x-forwarded-for": `10.20.${Math.floor(n / 250)}.${(n % 250) + 1}` };
}

export async function login(page: Page, email: string, password = PASSWORD, opts: { remember?: boolean } = {}) {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);
  if (opts.remember) await page.getByLabel("Remember me").check();
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function loginAndWait(page: Page, email: string, password = PASSWORD) {
  await login(page, email, password);
  await expect(page).not.toHaveURL(/\/login/);
}

/** The first absolute link in the most recent console email of a template sent to `to`. */
export async function latestEmailLink(to: string, template: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const row = await db.emailLog.findFirst({ where: { to, template, status: "SENT" }, orderBy: { createdAt: "desc" } });
    const m = row?.textBody?.match(/https?:\/\/[^\s]+/);
    if (m) return m[0];
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No ${template} email for ${to}`);
}

export async function emailCount(to: string, template: string) {
  return db.emailLog.count({ where: { to, template } });
}

export async function createVerifiedUser(opts: { email?: string; name?: string; role?: "LEARNER" | "ADMIN"; password?: string } = {}) {
  const { hash } = await import("bcryptjs").then((m) => ({ hash: m.default.hash }));
  const email = opts.email ?? uniqueEmail("user");
  const id = crypto.randomUUID();
  await db.user.create({
    data: {
      id,
      email,
      name: opts.name ?? "E2E User",
      role: opts.role ?? "LEARNER",
      emailVerifiedAt: new Date(),
      accounts: { create: { providerId: "credential", providerAccountId: id, passwordHash: await hash(opts.password ?? PASSWORD, 4) } },
    },
  });
  return { id, email };
}

/**
 * A tiny published course (1 reading lesson, 1 free-preview reading lesson, 1 quiz) so completion
 * flows run in seconds. Returns ids for assertions.
 */
export async function createMiniCourse(opts: { free?: boolean; priceKes?: number; sequential?: boolean; cap?: number } = {}) {
  const category = await db.category.findFirstOrThrow();
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const slug = `mini-${Date.now().toString(36)}-${++counter}`;
  const course = await db.course.create({
    data: {
      title: `Mini Course ${slug}`,
      slug,
      description: "<p>Tiny.</p>",
      shortDescription: "A tiny course for tests.",
      categoryId: category.id,
      instructorId: admin.id,
      level: "BEGINNER",
      isFree: opts.free ?? true,
      priceKes: opts.free === false ? (opts.priceKes ?? 3000) : 0,
      thumbnailUrl: "/media/public/thumbnails/endodontic-fundamentals.png",
      status: "PUBLISHED",
      publishedAt: new Date(),
      requireSequential: opts.sequential ?? false,
      enrollmentCap: opts.cap ?? null,
    },
  });
  const mod = await db.module.create({ data: { courseId: course.id, title: "Only module", sortOrder: 0 } });
  const reading = await db.lesson.create({ data: { moduleId: mod.id, title: "Read me", type: "READING", content: { html: "<p>Reading content here.</p>" }, durationSeconds: 120, sortOrder: 0 } });
  const reading2 = await db.lesson.create({ data: { moduleId: mod.id, title: "Read me too", type: "READING", content: { html: "<p>More reading.</p>" }, durationSeconds: 120, sortOrder: 1 } });
  const quiz = await db.lesson.create({ data: { moduleId: mod.id, title: "Check yourself", type: "QUIZ", content: { instructions: "One question." }, durationSeconds: 60, passMark: 70, sortOrder: 2 } });
  const q = await db.quizQuestion.create({ data: { lessonId: quiz.id, question: "Is the sky blue?", type: "SINGLE", explanation: "Rayleigh scattering.", sortOrder: 0 } });
  await db.quizOption.createMany({ data: [{ questionId: q.id, text: "Yes", isCorrect: true, sortOrder: 0 }, { questionId: q.id, text: "No", isCorrect: false, sortOrder: 1 }] });
  return { course, slug, lessons: { reading, reading2, quiz } };
}
