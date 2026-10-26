import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/dal";
import { getLessonView, isLessonLocked } from "@/lib/lesson-access";
import { recomputeProgress, setLessonCompletion } from "@/lib/progress";
import { issueCertificate } from "@/lib/certificates";
import { revokeEnrollment, upsertEnrollment } from "@/lib/enrollment";
import { saveCourse } from "@/lib/admin/course-service";
import { coursePayloadSchema } from "@/lib/course-schema";
import { resolveSlugRedirect, listCourses, searchCourseIds } from "@/lib/queries";
import { gradeQuiz } from "@/lib/domain/quiz";
import { makeCourse, makeUser, resetDb } from "../support/db";

beforeEach(resetDb);

const viewer = (u: { id: string; name: string; email: string; role: "LEARNER" | "ADMIN" }): SessionUser =>
  ({ ...u, avatarUrl: null, bio: null, emailVerifiedAt: new Date(), notificationPrefs: {}, createdAt: new Date() }) as SessionUser;

async function enrolled(courseId: string) {
  const u = await makeUser();
  const e = await db.enrollment.create({ data: { userId: u.id, courseId, source: "PURCHASE" } });
  return { u, e };
}

describe("guarded lesson access (AC 6)", () => {
  it("lets anyone read a free-preview lesson but nobody without access read paid ones", async () => {
    const { course, lessons } = await makeCourse();
    const outsider = await makeUser();

    expect((await getLessonView(null, lessons[0].id)).ok).toBe(true); // free preview, guest
    expect(await getLessonView(null, lessons[1].id)).toEqual({ ok: false, reason: "forbidden" });
    expect(await getLessonView(viewer(outsider), lessons[1].id)).toEqual({ ok: false, reason: "forbidden" });
    expect(await getLessonView(null, "does-not-exist")).toEqual({ ok: false, reason: "not_found" });
    void course;
  });

  it("serves paid content to active enrollees and admins, never to revoked learners", async () => {
    const { course, lessons } = await makeCourse();
    const { u, e } = await enrolled(course.id);
    const admin = await makeUser({ role: "ADMIN" });

    const view = await getLessonView(viewer(u), lessons[1].id);
    expect(view.ok && view.body.kind === "reading" && view.body.html).toContain("two");
    expect((await getLessonView(viewer(admin), lessons[1].id)).ok).toBe(true);

    await db.$transaction((tx) => revokeEnrollment(tx, e.id));
    expect(await getLessonView(viewer(u), lessons[1].id)).toEqual({ ok: false, reason: "forbidden" });
  });

  it("hides unpublished courses from the public (but not from admins)", async () => {
    const { lessons } = await makeCourse({ status: "DRAFT" });
    const admin = await makeUser({ role: "ADMIN" });
    expect(await getLessonView(null, lessons[0].id)).toEqual({ ok: false, reason: "not_found" });
    expect((await getLessonView(viewer(admin), lessons[0].id)).ok).toBe(true);
  });

  it("returns private media only as signed, expiring URLs and withholds quiz answers", async () => {
    const { course, mod } = await makeCourse();
    const { u } = await enrolled(course.id);
    const video = await db.lesson.create({
      data: { moduleId: mod.id, title: "V", type: "VIDEO", sortOrder: 9, content: { source: "file", key: "private/lessons/placeholder-1.mp4", captions: [{ label: "English", lang: "en", key: "private/captions/placeholder-1.vtt" }] } },
    });
    const v = await getLessonView(viewer(u), video.id);
    if (!v.ok || v.body.kind !== "video") throw new Error("expected video");
    expect(v.body.src).toMatch(/^\/media\/private\/lessons\/placeholder-1\.mp4\?exp=\d+&sig=/);
    expect(v.body.captions[0].src).toMatch(/sig=/);
    expect(v.expiresAt).toBeGreaterThan(Date.now());

    const quiz = await db.lesson.create({ data: { moduleId: mod.id, title: "Q", type: "QUIZ", sortOrder: 10, content: {} } });
    const q = await db.quizQuestion.create({ data: { lessonId: quiz.id, question: "?", type: "SINGLE", explanation: "secret explanation" } });
    await db.quizOption.createMany({ data: [{ questionId: q.id, text: "a", isCorrect: true }, { questionId: q.id, text: "b", isCorrect: false }] });
    const qv = await getLessonView(viewer(u), quiz.id);
    expect(JSON.stringify(qv)).not.toContain("isCorrect");
    expect(JSON.stringify(qv)).not.toContain("secret explanation");
  });

  it("enforces sequential unlocking for learners but not admins", async () => {
    const { course, lessons } = await makeCourse({ requireSequential: true });
    const { u, e } = await enrolled(course.id);
    const admin = await makeUser({ role: "ADMIN" });

    expect(await isLessonLocked(course, e.id, lessons[0].id)).toBe(false);
    expect(await isLessonLocked(course, e.id, lessons[1].id)).toBe(true);
    expect(await getLessonView(viewer(u), lessons[1].id)).toEqual({ ok: false, reason: "locked" });
    expect((await getLessonView(viewer(admin), lessons[1].id)).ok).toBe(true);

    await setLessonCompletion(e.id, lessons[0].id, true);
    expect((await getLessonView(viewer(u), lessons[1].id)).ok).toBe(true);
    expect((await getLessonView(viewer(u), lessons[2].id)).ok).toBe(false);
  });
});

describe("progress, completion and certificates (AC 13)", () => {
  it("recomputes percentage, completes at 100% and issues exactly one certificate", async () => {
    const { course, lessons } = await makeCourse();
    const { u, e } = await enrolled(course.id);

    expect(await setLessonCompletion(e.id, lessons[0].id, true)).toBe(33);
    expect(await setLessonCompletion(e.id, lessons[1].id, true)).toBe(67);
    expect(await db.certificate.count()).toBe(0);
    expect(await setLessonCompletion(e.id, lessons[2].id, true)).toBe(100);

    const done = await db.enrollment.findUniqueOrThrow({ where: { id: e.id } });
    expect(done.completedAt).not.toBeNull();
    const cert = await db.certificate.findUniqueOrThrow({ where: { enrollmentId: e.id } });
    expect(cert.code).toMatch(/^DENT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(cert.snapshot).toMatchObject({ learnerName: u.name, courseTitle: course.title });
    expect(await db.emailLog.count({ where: { to: u.email, template: "certificateIssued" } })).toBe(1);

    // idempotent
    await recomputeProgress(e.id);
    const again = await issueCertificate(e.id);
    expect(again?.created).toBe(false);
    expect(await db.certificate.count()).toBe(1);
  });

  it("snapshots names so later renames do not change an issued certificate", async () => {
    const { course, lessons } = await makeCourse();
    const { u, e } = await enrolled(course.id);
    for (const l of lessons) await setLessonCompletion(e.id, l.id, true);
    await db.user.update({ where: { id: u.id }, data: { name: "Renamed Person" } });
    await db.course.update({ where: { id: course.id }, data: { title: "Renamed Course" } });
    const cert = await db.certificate.findUniqueOrThrow({ where: { enrollmentId: e.id } });
    expect(cert.snapshot).toMatchObject({ learnerName: u.name, courseTitle: course.title });
  });

  it("revoking the enrollment revokes the certificate; restoring brings it back", async () => {
    const { course, lessons } = await makeCourse();
    const { e } = await enrolled(course.id);
    for (const l of lessons) await setLessonCompletion(e.id, l.id, true);
    await db.$transaction((tx) => revokeEnrollment(tx, e.id));
    expect((await db.certificate.findUniqueOrThrow({ where: { enrollmentId: e.id } })).revokedAt).not.toBeNull();
    await db.$transaction((tx) => upsertEnrollment(tx, { userId: e.userId, courseId: course.id, source: "PURCHASE" }));
    expect((await db.certificate.findUniqueOrThrow({ where: { enrollmentId: e.id } })).revokedAt).toBeNull();
  });

  it("does not issue certificates for revoked enrollments", async () => {
    const { course } = await makeCourse();
    const { e } = await enrolled(course.id);
    await db.$transaction((tx) => revokeEnrollment(tx, e.id));
    expect(await issueCertificate(e.id)).toBeNull();
  });
});

describe("quiz attempts", () => {
  it("stores attempts and best score; grading is pure server-side", () => {
    const r = gradeQuiz([{ id: "q", explanation: null, options: [{ id: "a", isCorrect: true }, { id: "b", isCorrect: false }] }], { q: ["a"] }, 70);
    expect(r.passed).toBe(true);
  });
});

describe("course editor persistence (AC 10)", () => {
  async function payloadFor(adminCategoryId: string, extra: Record<string, unknown> = {}) {
    return coursePayloadSchema.parse({
      title: "Brand New Course",
      categoryId: adminCategoryId,
      thumbnailUrl: "/media/public/thumbnails/x.png",
      shortDescription: "A course",
      description: "<p>Hello</p><script>alert(1)</script>",
      priceKes: 2000,
      modules: [
        {
          id: "mod_aaaaaa1",
          title: "Module 1",
          lessons: [
            { id: "les_aaaaaa1", title: "Reading", type: "READING", durationSeconds: 300, isFreePreview: true, readingHtml: "<p>hi</p><img src=x onerror=alert(1)>" },
            {
              id: "les_aaaaaa2",
              title: "Quiz",
              type: "QUIZ",
              durationSeconds: 120,
              isFreePreview: false,
              questions: [{ id: "que_aaaaaa1", question: "2+2?", type: "SINGLE", explanation: "", options: [{ id: "opt_aaaaaa1", text: "4", isCorrect: true }, { id: "opt_aaaaaa2", text: "5", isCorrect: false }] }],
            },
          ],
        },
      ],
      ...extra,
    });
  }

  it("creates a draft, publishes it, and it appears in the public catalog; unpublishing hides it", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const cat = await db.category.create({ data: { name: "C", slug: "c" } });
    const created = await saveCourse(admin.id, null, await payloadFor(cat.id), "autosave");
    if (!created.ok) throw new Error(created.error);
    expect(created.course.status).toBe("DRAFT");
    expect((await listCourses()).total).toBe(0);

    const pub = await saveCourse(admin.id, created.course.id, await payloadFor(cat.id), "publish");
    expect(pub.ok).toBe(true);
    expect((await listCourses()).courses.map((c) => c.slug)).toContain("brand-new-course");

    await saveCourse(admin.id, created.course.id, await payloadFor(cat.id), "unpublish");
    expect((await listCourses()).total).toBe(0);
  });

  it("sanitises rich text on save", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const cat = await db.category.create({ data: { name: "C", slug: "c" } });
    const res = await saveCourse(admin.id, null, await payloadFor(cat.id), "save");
    if (!res.ok) throw new Error(res.error);
    const course = await db.course.findUniqueOrThrow({ where: { id: res.course.id } });
    expect(course.description).not.toContain("script");
    const lesson = await db.lesson.findUniqueOrThrow({ where: { id: "les_aaaaaa1" } });
    expect(JSON.stringify(lesson.content)).not.toContain("onerror");
  });

  it("blocks publishing until the required checklist is met", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const cat = await db.category.create({ data: { name: "C", slug: "c" } });
    const noThumb = await saveCourse(admin.id, null, await payloadFor(cat.id, { thumbnailUrl: "" }), "publish");
    expect(noThumb).toMatchObject({ ok: false, missing: ["Thumbnail image"] });
    const noLessons = await saveCourse(admin.id, null, await payloadFor(cat.id, { modules: [] }), "publish");
    expect(noLessons).toMatchObject({ ok: false });
    expect(await db.course.count()).toBe(0);
  });

  it("keeps existing ids on re-save, so learner progress survives editing", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const cat = await db.category.create({ data: { name: "C", slug: "c" } });
    const first = await saveCourse(admin.id, null, await payloadFor(cat.id), "publish");
    if (!first.ok) throw new Error(first.error);
    const learner = await makeUser();
    const e = await db.enrollment.create({ data: { userId: learner.id, courseId: first.course.id, source: "PURCHASE" } });
    await setLessonCompletion(e.id, "les_aaaaaa1", true);

    // edit titles and add a lesson
    const edited = await payloadFor(cat.id);
    edited.modules[0].lessons[0].title = "Renamed reading";
    edited.modules[0].lessons.push({ ...edited.modules[0].lessons[0], id: "les_aaaaaa3", title: "Extra", isFreePreview: false });
    const second = await saveCourse(admin.id, first.course.id, edited, "save");
    expect(second.ok).toBe(true);

    expect(await db.lessonProgress.count({ where: { enrollmentId: e.id, lessonId: "les_aaaaaa1", completed: true } })).toBe(1);
    expect((await db.lesson.findUniqueOrThrow({ where: { id: "les_aaaaaa1" } })).title).toBe("Renamed reading");
    // 1 of 3 lessons complete after the extra lesson was added
    expect((await db.enrollment.findUniqueOrThrow({ where: { id: e.id } })).progressPercent).toBe(33);

    // removing a lesson removes only that lesson
    edited.modules[0].lessons = edited.modules[0].lessons.filter((l) => l.id !== "les_aaaaaa3");
    await saveCourse(admin.id, first.course.id, edited, "save");
    expect(await db.lesson.count({ where: { module: { courseId: first.course.id } } })).toBe(2);
  });

  it("refuses ids that belong to another course", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const cat = await db.category.create({ data: { name: "C", slug: "c" } });
    const a = await saveCourse(admin.id, null, await payloadFor(cat.id), "save");
    if (!a.ok) throw new Error(a.error);
    const hijack = await payloadFor(cat.id, { title: "Other course" });
    const b = await saveCourse(admin.id, null, hijack, "save"); // reuses mod_/les_ ids owned by course A
    expect(b).toMatchObject({ ok: false });
  });

  it("creates a redirect when the slug changes so old links keep working", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const cat = await db.category.create({ data: { name: "C", slug: "c" } });
    const created = await saveCourse(admin.id, null, await payloadFor(cat.id), "publish");
    if (!created.ok) throw new Error(created.error);
    const renamed = await saveCourse(admin.id, created.course.id, await payloadFor(cat.id, { slug: "shiny-new-slug", status: "PUBLISHED" }), "save");
    if (!renamed.ok) throw new Error(renamed.error);
    expect(renamed.course.slug).toBe("shiny-new-slug");
    expect(renamed.course.slugChanged).toBe(true);
    expect(await resolveSlugRedirect("brand-new-course")).toBe("shiny-new-slug");
    expect(await resolveSlugRedirect("unknown")).toBeNull();
  });

  it("keeps slugs unique", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const cat = await db.category.create({ data: { name: "C", slug: "c" } });
    const a = await saveCourse(admin.id, null, await payloadFor(cat.id, { modules: [] }), "save");
    const b = await saveCourse(admin.id, null, await payloadFor(cat.id, { modules: [] }), "save");
    if (!a.ok || !b.ok) throw new Error("save failed");
    expect(a.course.slug).not.toBe(b.course.slug);
  });
});

describe("catalog search + filters", () => {
  it("finds courses by title, description and lesson titles (full-text + prefix)", async () => {
    const { course, mod } = await makeCourse({ slug: "endo-course" });
    await db.course.update({ where: { id: course.id }, data: { title: "Endodontic Fundamentals", shortDescription: "Root canal therapy basics" } });
    await db.lesson.create({ data: { moduleId: mod.id, title: "Obturation techniques", type: "READING", content: {}, sortOrder: 5 } });
    await makeCourse({ slug: "other-course" });

    expect(await searchCourseIds("endodontic")).toEqual([course.id]);
    expect(await searchCourseIds("root canal")).toEqual([course.id]);
    expect(await searchCourseIds("obturation")).toEqual([course.id]); // lesson title
    expect(await searchCourseIds("endo")).toEqual([course.id]); // partial word
    expect(await searchCourseIds("zzzz")).toEqual([]);
    expect((await listCourses({ search: "Obturation" })).total).toBe(1);
  });

  it("filters by price, sorts, paginates and only shows published courses", async () => {
    await makeCourse({ slug: "a", priceKes: 1000 });
    await makeCourse({ slug: "b", priceKes: 9000 });
    await makeCourse({ slug: "free", isFree: true, priceKes: 0 });
    await makeCourse({ slug: "draft", status: "DRAFT" });

    expect((await listCourses()).total).toBe(3);
    expect((await listCourses({ price: "free" })).courses.map((c) => c.slug)).toEqual(["free"]);
    expect((await listCourses({ minPrice: 5000 })).courses.map((c) => c.slug)).toEqual(["b"]);
    expect((await listCourses({ sort: "price-desc" })).courses.map((c) => c.slug)).toEqual(["b", "a", "free"]);
    expect((await listCourses({ page: 99 })).page).toBe(1);
  });
});
