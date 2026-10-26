import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth/password";
import { getStorage } from "../src/lib/storage";
import { makeCertificateCode } from "../src/lib/certificates";
import { categories, courses, reviewsPool, type SeedCourse } from "./seed-data";

/**
 * Deterministic demo dataset (spec v1 §10 + LMS spec AC 17). Re-running wipes
 * every table and rebuilds it identically (a seeded PRNG replaces Math.random),
 * so the app is immediately explorable after `npm run db:seed`.
 *
 * Run: npm run db:seed   (uses `tsx --conditions=react-server` so `server-only`
 * imports resolve outside Next.js)
 */

const DEMO_PASSWORD = "Demo@1234";
const CLIP_COUNT = 10;
const ASSETS = path.join(process.cwd(), "assets", "placeholder");

// --- deterministic randomness ---
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260101);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

const NOW = new Date();
function daysAgo(n: number) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

const clip = (n: number) => (n % CLIP_COUNT) + 1;

async function wipe() {
  const rows = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const tables = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

async function uploadMedia() {
  const storage = getStorage();
  for (let n = 1; n <= CLIP_COUNT; n++) {
    const video = readFileSync(path.join(ASSETS, "videos", `placeholder-${n}.mp4`));
    const caption = readFileSync(path.join(ASSETS, "captions", `placeholder-${n}.vtt`));
    // Lesson media is PRIVATE (signed URLs after an access check); the intro clip is public.
    await storage.putObject(`private/lessons/placeholder-${n}.mp4`, video, "video/mp4");
    await storage.putObject(`private/captions/placeholder-${n}.vtt`, caption, "text/vtt");
    await storage.putObject(`public/preview/placeholder-${n}.mp4`, video, "video/mp4");
  }

  // A real downloadable PDF for the resource lessons.
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("Clinical reference checklist", { x: 48, y: 780, size: 22, font: bold, color: rgb(0.04, 0.33, 0.33) });
  ["Verify patient history and consent", "Confirm the working diagnosis", "Prepare and check instruments", "Follow the stepwise protocol", "Document and schedule follow-up"].forEach((t, i) =>
    page.drawText(`[  ]  ${t}`, { x: 48, y: 730 - i * 28, size: 13, font })
  );
  await storage.putObject("private/resources/clinical-checklist.pdf", Buffer.from(await doc.save()), "application/pdf");
}

async function thumbnail(slug: string, title: string, hue: number): Promise<string> {
  const lines = title.length > 38 ? [title.slice(0, title.lastIndexOf(" ", 38)), title.slice(title.lastIndexOf(" ", 38) + 1)] : [title];
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,22%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},50%,38%)"/></linearGradient></defs>
    <rect width="1280" height="720" fill="url(#g)"/>
    <circle cx="1080" cy="140" r="220" fill="#d6a23c" fill-opacity="0.18"/>
    <rect x="80" y="440" width="120" height="8" rx="4" fill="#d6a23c"/>
    ${lines.map((l, i) => `<text x="80" y="${520 + i * 74}" font-family="Georgia, serif" font-size="64" fill="#faf7f2">${esc(l)}</text>`).join("")}
  </svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const key = `public/thumbnails/${slug}.png`;
  const storage = getStorage();
  await storage.putObject(key, png, "image/png");
  return storage.publicUrl(key);
}

async function main() {
  console.log("Wiping existing data…");
  await wipe();

  console.log("Uploading placeholder media…");
  await uploadMedia();
  const storage = getStorage();

  console.log("Creating users…");
  const passwordHash = await hashPassword(DEMO_PASSWORD); // one hash reused: the demo password is shared
  async function user(name: string, email: string, opts: { role?: "ADMIN" | "LEARNER"; verified?: boolean; createdDaysAgo?: number; avatarUrl?: string; bio?: string } = {}) {
    const created = await db.user.create({
      data: {
        name,
        email,
        role: opts.role ?? "LEARNER",
        avatarUrl: opts.avatarUrl,
        bio: opts.bio,
        emailVerifiedAt: opts.verified === false ? null : daysAgo((opts.createdDaysAgo ?? 0) - 0),
        createdAt: daysAgo(opts.createdDaysAgo ?? 0),
        lastLoginAt: daysAgo(Math.max(0, (opts.createdDaysAgo ?? 0) - int(0, 3))),
      },
    });
    await db.account.create({ data: { userId: created.id, providerId: "credential", providerAccountId: created.id, passwordHash } });
    return created;
  }

  const admin = await user("Dr. Godfrey Maronga", "admin@demo.co.ke", {
    role: "ADMIN",
    createdDaysAgo: 365,
    avatarUrl: "/maronga.jpg",
    bio: "Practicing dentist and founder of Maronga Dental Academy, with over 15 years of clinical experience across general and cosmetic dentistry.",
  });
  const learner0 = await user("Faith Njeri", "learner0@demo.co.ke", { createdDaysAgo: 2 });
  const learner40 = await user("Brian Otieno", "learner40@demo.co.ke", { createdDaysAgo: 20 });
  const learner100 = await user("Amina Wanjiru", "learner100@demo.co.ke", { createdDaysAgo: 60 });
  const unverified = await user("Kevin Mutua", "unverified@demo.co.ke", { createdDaysAgo: 1, verified: false });

  const fillerNames = [
    "Peter Kamau", "Grace Achieng", "Samuel Mutiso", "Mercy Wambui", "John Kiptoo", "Lucy Chebet", "David Mwangi", "Esther Nyambura",
    "Kevin Omondi", "Sarah Akinyi", "Daniel Kariuki", "Ann Wairimu", "Joseph Ndegwa", "Ruth Moraa", "Michael Kilonzo",
  ];
  const fillers = [];
  for (const [i, name] of fillerNames.entries()) {
    fillers.push(await user(name, `student${i + 1}@demo.co.ke`, { createdDaysAgo: int(1, 340), verified: rand() > 0.2 }));
  }
  const allLearners = [learner0, learner40, learner100, ...fillers];

  console.log("Creating categories and courses…");
  const categoryByName = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const created = await db.category.create({ data: { name: c.name, slug: c.slug, description: c.description, sortOrder: i, iconUrl: c.icon } });
    categoryByName.set(c.name, created.id);
  }

  type SeededCourse = Awaited<ReturnType<typeof createCourse>>;
  let clipCounter = 0;
  async function createCourse(sc: SeedCourse, index: number) {
    const categoryId = categoryByName.get(sc.category);
    if (!categoryId) throw new Error(`Unknown category ${sc.category}`);
    const isFree = !!sc.isFree;

    const course = await db.course.create({
      data: {
        title: sc.title,
        slug: sc.slug,
        subtitle: sc.subtitle,
        description: sc.descriptionHtml,
        shortDescription: sc.shortDescription,
        categoryId,
        instructorId: admin.id,
        level: sc.level,
        priceKes: isFree ? 0 : sc.priceKes,
        salePriceKes: sc.salePriceKes ?? null,
        isFree,
        thumbnailUrl: await thumbnail(sc.slug, sc.title, (index * 47 + 160) % 360),
        previewVideoUrl: storage.publicUrl(`public/preview/placeholder-${clip(index)}.mp4`),
        status: "PUBLISHED",
        isFeatured: !!sc.isFeatured,
        // One course demonstrates sequential unlocking.
        requireSequential: sc.slug === "running-a-modern-dental-practice",
        metaTitle: sc.title,
        metaDescription: sc.shortDescription,
        publishedAt: daysAgo(90 - index),
        createdAt: daysAgo(120 - index),
      },
    });
    await db.courseOutcome.createMany({ data: sc.outcomes.map((text, i) => ({ courseId: course.id, text, sortOrder: i })) });
    await db.courseRequirement.createMany({ data: sc.requirements.map((text, i) => ({ courseId: course.id, text, sortOrder: i })) });
    await db.courseAudience.createMany({ data: sc.audience.map((text, i) => ({ courseId: course.id, text, sortOrder: i })) });

    const lessons: { id: string; type: string; durationSeconds: number; quizQuestionIds: string[]; correctByQuestion: Record<string, string[]> }[] = [];
    for (const [mi, mod] of sc.modules.entries()) {
      const m = await db.module.create({ data: { courseId: course.id, title: mod.title, description: mod.description, sortOrder: mi } });
      for (const [li, lesson] of mod.lessons.entries()) {
        const n = clip(clipCounter++);
        let content: Prisma.InputJsonObject = {};
        if (lesson.type === "VIDEO") {
          content = {
            source: "file",
            key: `private/lessons/placeholder-${n}.mp4`,
            captions: [{ label: "English", lang: "en", key: `private/captions/placeholder-${n}.vtt` }],
            transcript: `Welcome to "${lesson.title}". This is a placeholder clip generated for the demo; replace it with your own footage from the course editor.`,
            attachments: [],
          };
        } else if (lesson.type === "READING") {
          content = { html: lesson.readingHtml ?? "<p></p>", attachments: [] };
        } else if (lesson.type === "RESOURCE") {
          content = {
            resource: { kind: "file", label: lesson.resource?.label ?? lesson.title, key: "private/resources/clinical-checklist.pdf", filename: "clinical-checklist.pdf" },
            description: "A printable checklist to keep at the chairside.",
          };
        } else if (lesson.type === "QUIZ") {
          content = { instructions: "Answer every question. You need 70% to pass and continue." };
        }

        const created = await db.lesson.create({
          data: {
            moduleId: m.id,
            title: lesson.title,
            type: lesson.type,
            durationSeconds: (lesson.minutes ?? 5) * 60,
            content,
            passMark: 70,
            isFreePreview: !!lesson.freePreview,
            sortOrder: li,
          },
        });
        const entry = { id: created.id, type: lesson.type, durationSeconds: created.durationSeconds, quizQuestionIds: [] as string[], correctByQuestion: {} as Record<string, string[]> };

        if (lesson.type === "QUIZ" && lesson.quiz) {
          for (const [qi, q] of lesson.quiz.entries()) {
            const question = await db.quizQuestion.create({
              data: { lessonId: created.id, question: q.question, type: q.type, explanation: q.explanation, sortOrder: qi },
            });
            const options = [];
            for (const [oi, o] of q.options.entries()) {
              options.push(await db.quizOption.create({ data: { questionId: question.id, text: o.text, isCorrect: o.correct, sortOrder: oi } }));
            }
            entry.quizQuestionIds.push(question.id);
            entry.correctByQuestion[question.id] = options.filter((o) => o.isCorrect).map((o) => o.id);
          }
        }
        lessons.push(entry);
      }
    }
    return { ...course, lessons };
  }

  const courseBySlug = new Map<string, SeededCourse>();
  for (const [i, sc] of courses.entries()) courseBySlug.set(sc.slug, await createCourse(sc, i));
  const allCourses = [...courseBySlug.values()];

  console.log("Enrolling learners, progress, payments…");
  let invoiceSeq = 0;
  const invoiceNo = (d: Date) => `INV-${d.getFullYear()}-${String(++invoiceSeq).padStart(5, "0")}`;

  async function enroll(
    userId: string,
    course: SeededCourse,
    opts: { progressPercent: number; method?: "MPESA" | "CARD" | "MANUAL" | "FREE"; couponCode?: string; enrolledAt?: Date; certificate?: boolean }
  ) {
    const enrolledAt = opts.enrolledAt ?? daysAgo(int(1, 300));
    const free = course.isFree;
    const method = free ? "FREE" : (opts.method ?? pick(["MPESA", "CARD"] as const));
    const completedAt = opts.progressPercent >= 100 ? new Date(enrolledAt.getTime() + 3 * 86_400_000) : null;

    const enrollment = await db.enrollment.create({
      data: {
        userId,
        courseId: course.id,
        enrolledAt,
        completedAt,
        progressPercent: opts.progressPercent,
        source: method === "MANUAL" ? "MANUAL" : free ? "FREE" : opts.couponCode ? "COUPON" : "PURCHASE",
      },
    });

    const toComplete = Math.floor((course.lessons.length * opts.progressPercent) / 100);
    for (const [i, l] of course.lessons.entries()) {
      const done = i < toComplete;
      if (!done && i !== toComplete) continue; // only touch completed lessons + the "current" one
      await db.lessonProgress.create({
        data: {
          enrollmentId: enrollment.id,
          lessonId: l.id,
          completed: done,
          completedAt: done ? new Date(enrolledAt.getTime() + (i + 1) * 3_600_000) : null,
          lastPositionSeconds: l.type === "VIDEO" ? (done ? Math.floor(l.durationSeconds * 0.95) : 45) : 0,
          bestScorePercent: done && l.type === "QUIZ" ? 100 : null,
        },
      });
      if (done && l.type === "QUIZ") {
        await db.quizAttempt.create({
          data: { enrollmentId: enrollment.id, userId, lessonId: l.id, answers: l.correctByQuestion, scorePercent: 100, passed: true, createdAt: new Date(enrolledAt.getTime() + (i + 1) * 3_600_000) },
        });
      }
    }
    const last = course.lessons[Math.max(0, toComplete - 1)];
    if (last && toComplete > 0) await db.enrollment.update({ where: { id: enrollment.id }, data: { lastLessonId: course.lessons[Math.min(toComplete, course.lessons.length - 1)].id } });

    if (method === "FREE" || method === "MANUAL") {
      await db.payment.create({
        data: { userId, courseId: course.id, enrollmentId: enrollment.id, idempotencyKey: `seed-free-${enrollment.id}`, amountKes: 0, method, status: "SUCCESS", createdAt: enrolledAt },
      });
    } else {
      const subtotal = course.salePriceKes ?? course.priceKes;
      const discount = opts.couponCode === "WELCOME10" ? Math.round(subtotal * 0.1) : 0;
      const payment = await db.payment.create({
        data: {
          userId,
          courseId: course.id,
          enrollmentId: enrollment.id,
          idempotencyKey: `seed-pay-${enrollment.id}`,
          subtotalKes: subtotal,
          discountKes: discount,
          amountKes: subtotal - discount,
          method,
          status: "SUCCESS",
          reference: method === "MPESA" ? `MDEMO${int(10_000_000, 99_999_999)}` : `ch_demo_${int(100_000_000, 999_999_999)}`,
          phone: method === "MPESA" ? `2547${int(10_000_000, 99_999_999)}` : null,
          cardBrand: method === "CARD" ? "visa" : null,
          cardLast4: method === "CARD" ? String(int(1000, 9999)) : null,
          couponCode: opts.couponCode ?? null,
          invoiceNumber: invoiceNo(enrolledAt),
          createdAt: enrolledAt,
        },
      });
      if (opts.couponCode) {
        const coupon = await db.coupon.findUnique({ where: { code: opts.couponCode } });
        if (coupon) await db.couponUsage.create({ data: { couponId: coupon.id, userId, paymentId: payment.id, usedAt: enrolledAt } });
      }
    }

    if (opts.certificate || opts.progressPercent >= 100) {
      const u = await db.user.findUniqueOrThrow({ where: { id: userId } });
      await db.certificate.create({
        data: {
          enrollmentId: enrollment.id,
          code: makeCertificateCode("DENT"),
          issuedAt: completedAt ?? enrolledAt,
          snapshot: { learnerName: u.name, courseTitle: course.title, completedAt: (completedAt ?? enrolledAt).toISOString(), instructorName: admin.name },
        },
      });
    }
    return enrollment;
  }

  // Coupons first so seeded purchases can reference WELCOME10.
  const specificCourses = allCourses.slice(0, 3);
  await db.coupon.create({ data: { code: "WELCOME10", discountType: "PERCENT", discountValue: 10, isActive: true } });
  const student500 = await db.coupon.create({ data: { code: "STUDENT500", discountType: "FIXED", discountValue: 500, isActive: true, perUserLimit: 1 } });
  await db.coupon.create({ data: { code: "EXPIRED", discountType: "PERCENT", discountValue: 20, isActive: true, startsAt: daysAgo(60), endsAt: daysAgo(10) } });
  await db.couponCourse.createMany({ data: specificCourses.map((c) => ({ couponId: student500.id, courseId: c.id })) });

  const endo = courseBySlug.get("endodontic-fundamentals")!;
  const composite = courseBySlug.get("composite-restorations-anterior-aesthetics")!;
  const pediatric = courseBySlug.get("pediatric-behavior-management")!;
  const anesthesia = courseBySlug.get("local-anesthesia-techniques-refresher")!;
  const practice = courseBySlug.get("running-a-modern-dental-practice");

  // The three named demo states (0% / 40% / 100% + certificate).
  await enroll(learner0.id, endo, { progressPercent: 0, method: "MPESA", enrolledAt: daysAgo(1) });
  await enroll(learner40.id, composite, { progressPercent: 40, method: "CARD", enrolledAt: daysAgo(10) });
  await enroll(learner100.id, pediatric, { progressPercent: 100, enrolledAt: daysAgo(45), certificate: true });
  await enroll(learner40.id, anesthesia, { progressPercent: 20, method: "MANUAL", enrolledAt: daysAgo(3) });
  if (practice) await enroll(learner100.id, practice, { progressPercent: 40, method: "MPESA", enrolledAt: daysAgo(30) });
  await db.wishlist.createMany({
    data: [
      { userId: learner0.id, courseId: composite.id },
      { userId: learner40.id, courseId: endo.id },
    ],
  });

  // Notes for the 40% learner.
  const firstVideo = composite.lessons.find((l) => l.type === "VIDEO");
  if (firstVideo) {
    await db.lessonNote.createMany({
      data: [
        { userId: learner40.id, lessonId: firstVideo.id, content: "Layering order: dentin shade first, then enamel.", videoTimestampSeconds: null },
        { userId: learner40.id, lessonId: firstVideo.id, content: "Check shade under natural light", videoTimestampSeconds: 32 },
      ],
    });
  }

  // Spread enrollments across the year for charts, plus the refunded / failed / cancelled samples.
  const spread = fillers.slice(2);
  for (const learner of spread) {
    const count = int(1, 3);
    const picked = new Set<string>();
    for (let i = 0; i < count; i++) {
      const course = pick(allCourses);
      if (picked.has(course.id)) continue;
      picked.add(course.id);
      await enroll(learner.id, course, {
        progressPercent: pick([0, 15, 40, 60, 85, 100]),
        enrolledAt: daysAgo(int(0, 360)),
        couponCode: !course.isFree && rand() > 0.85 ? "WELCOME10" : undefined,
      });
    }
  }

  // One refunded purchase (enrollment revoked) …
  const refundedEnrollment = await enroll(fillers[0].id, allCourses[4], { progressPercent: 15, method: "CARD", enrolledAt: daysAgo(40) });
  await db.payment.updateMany({ where: { enrollmentId: refundedEnrollment.id }, data: { status: "REFUNDED", refundedAt: daysAgo(35) } });
  await db.enrollment.update({ where: { id: refundedEnrollment.id }, data: { status: "REVOKED", revokedAt: daysAgo(35) } });
  // … one failed, one cancelled (neither created an enrollment).
  await db.payment.create({
    data: { userId: fillers[1].id, courseId: allCourses[0].id, idempotencyKey: "seed-failed-1", subtotalKes: allCourses[0].priceKes, amountKes: allCourses[0].priceKes, method: "CARD", status: "FAILED", failureReason: "Your card was declined.", cardBrand: "visa", cardLast4: "0000", createdAt: daysAgo(8) },
  });
  await db.payment.create({
    data: { userId: fillers[2].id, courseId: allCourses[1].id, idempotencyKey: "seed-cancelled-1", subtotalKes: allCourses[1].salePriceKes ?? allCourses[1].priceKes, amountKes: allCourses[1].salePriceKes ?? allCourses[1].priceKes, method: "MPESA", status: "CANCELLED", failureReason: "Cancelled by you.", phone: "254711111111", createdAt: daysAgo(5) },
  });
  await db.sequence.upsert({ where: { name: "invoice" }, update: { value: invoiceSeq }, create: { name: "invoice", value: invoiceSeq } });

  console.log("Creating reviews, votes, discussion…");
  const enrollments = await db.enrollment.findMany({ where: { status: "ACTIVE", progressPercent: { gte: 15 } }, include: { user: true } });
  const reviewRows = [];
  const used = new Set<string>();
  for (const e of enrollments) {
    const key = `${e.userId}:${e.courseId}`;
    if (used.has(key) || rand() > 0.55 || !e.user.emailVerifiedAt) continue;
    used.add(key);
    const review = await db.review.create({
      data: { userId: e.userId, courseId: e.courseId, rating: pick([3, 4, 4, 5, 5, 5]), text: pick(reviewsPool), createdAt: daysAgo(int(0, 200)) },
    });
    reviewRows.push(review);
  }
  if (reviewRows[0]) await db.review.update({ where: { id: reviewRows[0].id }, data: { instructorReply: "Thank you for the kind words. Glad it helped your practice!", repliedAt: daysAgo(1) } });
  if (reviewRows[1]) await db.review.update({ where: { id: reviewRows[1].id }, data: { status: "HIDDEN" } });
  for (const [i, r] of reviewRows.slice(0, 8).entries()) {
    const voter = allLearners.find((l) => l.id !== r.userId && l.emailVerifiedAt !== null) ?? learner0;
    await db.reviewVote.create({ data: { reviewId: r.id, userId: voter.id, helpful: i % 4 !== 3 } });
  }
  if (firstVideo) {
    const q = await db.lessonComment.create({ data: { lessonId: firstVideo.id, userId: learner40.id, body: "Which composite brand do you recommend for the enamel layer?", createdAt: daysAgo(4) } });
    await db.lessonComment.create({ data: { lessonId: firstVideo.id, userId: admin.id, parentId: q.id, body: "Any nano-hybrid with good polish retention works. I show my preference in module 3.", createdAt: daysAgo(3) } });
  }

  console.log("Creating site content, settings, ops data…");
  const settings: Record<string, Prisma.InputJsonValue> = {
    general: {
      siteName: "Maronga Dental Academy",
      tagline: "Authoritative dental education from a practicing clinician",
      contactEmail: "hello@example.com",
      phone: "+254 700 000 000",
      whatsapp: "254700000000",
      address: "Nairobi, Kenya",
      logoUrl: "",
      faviconUrl: "",
      social: { facebook: "", instagram: "", linkedin: "", youtube: "" },
    },
    branding: { primaryColor: "#0b5454", secondaryColor: "#b9842a", font: "Lora + Inter" },
    payments: { mpesaShortcode: "174379", mpesaConsumerKey: "", mpesaConsumerSecret: "", stripePublishable: "", stripeSecret: "", usdKesRate: 129 },
    legal: {
      terms: "<h2>Terms of Service</h2><p>Placeholder terms. Replace with your reviewed legal copy before launch.</p>",
      privacy: "<h2>Privacy Policy</h2><p>Placeholder privacy policy. Replace with your reviewed legal copy before launch.</p>",
      refundPolicy: "<h2>Refund Policy</h2><p>Placeholder refund policy. Replace with your reviewed legal copy before launch.</p>",
    },
    certificateTemplate: { primaryColor: "#0b5454", accentColor: "#b9842a", signatureName: "Dr. Godfrey Maronga", signatureTitle: "Founder, Maronga Dental Academy", backgroundKey: "", signatureKey: "" },
    invoice: { sellerName: "Maronga Dental Academy", sellerAddress: "Nairobi, Kenya", sellerTaxId: "", prefix: "INV" },
  };
  for (const [key, value] of Object.entries(settings)) await db.setting.create({ data: { key, value } });

  await db.faq.createMany({
    data: [
      ["Are courses recognized for CPD/CME points?", "Accreditation varies by course and regulatory body. Check each course page for details or contact us before enrolling."],
      ["How long do I have access to a course?", "Once enrolled you have lifetime access to that course, including future updates."],
      ["What payment methods are accepted?", "M-Pesa and major debit/credit cards. Prices are in Kenyan Shillings; a USD display toggle is available."],
      ["Can I get a refund?", "See the Refund Policy page for eligibility and how to request one."],
      ["Do I get a certificate?", "Yes. Completing every lesson issues a downloadable certificate with a public verification link. Your email must be verified to download it."],
      ["Can I preview a course before enrolling?", "Every course has an intro video and most have free-preview lessons you can watch without an account."],
    ].map(([question, answer], sortOrder) => ({ question, answer: `<p>${answer}</p>`, sortOrder })),
  });

  await db.subscriber.createMany({
    data: [
      { email: "prospect1@example.com", confirmedAt: daysAgo(10) },
      { email: "prospect2@example.com", confirmedAt: daysAgo(6) },
      { email: "prospect3@example.com" },
    ],
  });
  await db.contactSubmission.createMany({
    data: [
      { name: "James Mwangi", email: "james.mwangi@example.com", subject: "Group discount for our clinic", message: "We have 6 dentists at our clinic. Do you offer a group rate for the endodontics course?", status: "NEW", createdAt: daysAgo(2) },
      { name: "Nancy Wairimu", email: "nancy.w@example.com", subject: "Certificate accreditation", message: "Is the completion certificate recognized by the Kenya Dental Board for CPD points?", status: "READ", createdAt: daysAgo(6) },
    ],
  });
  await db.notification.createMany({
    data: [
      { type: "signup", payload: { name: learner0.name }, createdAt: daysAgo(2) },
      { type: "enrollment", payload: { course: endo.title, userId: learner0.id }, createdAt: daysAgo(1) },
      { type: "contact_submission", payload: { subject: "Group discount for our clinic" }, createdAt: daysAgo(2) },
    ],
  });
  await db.studentNote.create({ data: { studentId: learner40.id, authorId: admin.id, text: "Asked about group pricing for their clinic: follow up in January." } });

  console.log("Seed complete.");
  console.log(`  Admin:    admin@demo.co.ke / ${DEMO_PASSWORD}`);
  console.log(`  Learners: learner0@demo.co.ke (0%), learner40@demo.co.ke (40%), learner100@demo.co.ke (100% + certificate) / ${DEMO_PASSWORD}`);
  console.log(`  Unverified: ${unverified.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
