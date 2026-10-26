import { db } from "@/lib/db";

/** Wipe every table (except Prisma's migration ledger) between integration tests. */
export async function resetDb() {
  const rows = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const tables = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

let n = 0;
export async function makeUser(over: Partial<{ email: string; role: "LEARNER" | "ADMIN"; verified: boolean; status: "ACTIVE" | "SUSPENDED" }> = {}) {
  n += 1;
  return db.user.create({
    data: {
      name: `User ${n}`,
      email: over.email ?? `user${n}-${Date.now()}@test.local`,
      role: over.role ?? "LEARNER",
      status: over.status ?? "ACTIVE",
      emailVerifiedAt: over.verified === false ? null : new Date(),
    },
  });
}

export async function makeCourse(over: Partial<{ slug: string; priceKes: number; isFree: boolean; status: "DRAFT" | "PUBLISHED"; requireSequential: boolean; enrollmentCap: number | null; salePriceKes: number | null }> = {}) {
  n += 1;
  const admin = await makeUser({ role: "ADMIN" });
  const category = await db.category.create({ data: { name: `Cat ${n}`, slug: `cat-${n}-${Date.now()}` } });
  const course = await db.course.create({
    data: {
      title: `Course ${n}`,
      slug: over.slug ?? `course-${n}-${Date.now()}`,
      description: "<p>d</p>",
      shortDescription: "short",
      categoryId: category.id,
      instructorId: admin.id,
      level: "BEGINNER",
      priceKes: over.priceKes ?? 5000,
      salePriceKes: over.salePriceKes ?? null,
      isFree: over.isFree ?? false,
      thumbnailUrl: "/x.png",
      status: over.status ?? "PUBLISHED",
      requireSequential: over.requireSequential ?? false,
      enrollmentCap: over.enrollmentCap ?? null,
    },
  });
  const mod = await db.module.create({ data: { courseId: course.id, title: "M1", sortOrder: 0 } });
  const l1 = await db.lesson.create({ data: { moduleId: mod.id, title: "L1", type: "READING", content: { html: "<p>one</p>" }, sortOrder: 0, isFreePreview: true } });
  const l2 = await db.lesson.create({ data: { moduleId: mod.id, title: "L2", type: "READING", content: { html: "<p>two</p>" }, sortOrder: 1 } });
  const l3 = await db.lesson.create({ data: { moduleId: mod.id, title: "L3", type: "READING", content: { html: "<p>three</p>" }, sortOrder: 2 } });
  return { course, admin, category, mod, lessons: [l1, l2, l3] };
}
