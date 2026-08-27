import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/lib/db";
import { categories, courses, reviewsPool, type SeedCourse } from "./seed-data";

const DEMO_PASSWORD = "Demo@1234";
const VIDEO_POOL_SIZE = 10;
const videoUrl = (n: number) => `/videos/placeholder-${(n % VIDEO_POOL_SIZE) + 1}.mp4`;
const captionUrl = (n: number) => `/captions/placeholder-${(n % VIDEO_POOL_SIZE) + 1}.vtt`;

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("Clearing existing data...");
  // SQLite FK-safe deletion order (children first). db push already applied
  // cascade rules, but this keeps the script idempotent even without them.
  await db.$transaction([
    db.lessonNote.deleteMany(),
    db.lessonProgress.deleteMany(),
    db.couponUsage.deleteMany(),
    db.couponCourse.deleteMany(),
    db.coupon.deleteMany(),
    db.certificate.deleteMany(),
    db.payment.deleteMany(),
    db.review.deleteMany(),
    db.wishlist.deleteMany(),
    db.enrollment.deleteMany(),
    db.quizOption.deleteMany(),
    db.quizQuestion.deleteMany(),
    db.lesson.deleteMany(),
    db.module.deleteMany(),
    db.courseOutcome.deleteMany(),
    db.courseRequirement.deleteMany(),
    db.courseAudience.deleteMany(),
    db.course.deleteMany(),
    db.category.deleteMany(),
    db.contactSubmission.deleteMany(),
    db.subscriber.deleteMany(),
    db.notification.deleteMany(),
    db.setting.deleteMany(),
    db.studentNote.deleteMany(),
    db.activityLog.deleteMany(),
    db.session.deleteMany(),
    db.user.deleteMany(),
  ]);

  console.log("Creating admin + learners...");
  const passwordHash = await hash(DEMO_PASSWORD);

  const admin = await db.user.create({
    data: {
      name: "Dr. Godfrey Maronga",
      email: "admin@demo.co.ke",
      passwordHash,
      role: "ADMIN",
      avatarUrl: "/maronga.jpg",
      bio: "Practicing dentist and founder of Maronga Dental Academy, with over 15 years of clinical experience across general and cosmetic dentistry.",
      verifiedAt: new Date(),
    },
  });

  const learner0 = await db.user.create({
    data: {
      name: "Faith Njeri",
      email: "learner0@demo.co.ke",
      passwordHash,
      role: "LEARNER",
      verifiedAt: new Date(),
      createdAt: daysAgo(2),
    },
  });
  const learner40 = await db.user.create({
    data: {
      name: "Brian Otieno",
      email: "learner40@demo.co.ke",
      passwordHash,
      role: "LEARNER",
      verifiedAt: new Date(),
      createdAt: daysAgo(20),
    },
  });
  const learner100 = await db.user.create({
    data: {
      name: "Amina Wanjiru",
      email: "learner100@demo.co.ke",
      passwordHash,
      role: "LEARNER",
      verifiedAt: new Date(),
      createdAt: daysAgo(60),
    },
  });

  // Filler learners so admin analytics/charts and reviews have real spread.
  const fillerNames = [
    "Peter Kamau", "Grace Achieng", "Samuel Mutiso", "Mercy Wambui", "John Kiptoo",
    "Lucy Chebet", "David Mwangi", "Esther Nyambura", "Kevin Omondi", "Sarah Akinyi",
    "Daniel Kariuki", "Ann Wairimu", "Joseph Ndegwa", "Ruth Moraa", "Michael Kilonzo",
  ];
  const fillerLearners = [];
  for (let i = 0; i < fillerNames.length; i++) {
    const u = await db.user.create({
      data: {
        name: fillerNames[i],
        email: `student${i + 1}@demo.co.ke`,
        passwordHash,
        role: "LEARNER",
        verifiedAt: Math.random() > 0.2 ? new Date() : null,
        createdAt: daysAgo(Math.floor(Math.random() * 340) + 1),
      },
    });
    fillerLearners.push(u);
  }
  const allLearners = [learner0, learner40, learner100, ...fillerLearners];

  console.log("Creating categories...");
  const categoryBySlug = new Map<string, { id: string; name: string }>();
  for (const [i, c] of categories.entries()) {
    const created = await db.category.create({
      data: { name: c.name, slug: c.slug, description: c.description, sortOrder: i },
    });
    categoryBySlug.set(c.name, created);
  }

  console.log("Creating courses...");
  let videoCounter = 0;
  const courseBySlug = new Map<string, Awaited<ReturnType<typeof createCourse>>>();

  async function createCourse(sc: SeedCourse) {
    const category = categoryBySlug.get(sc.category);
    if (!category) throw new Error(`Unknown category ${sc.category}`);

    const course = await db.course.create({
      data: {
        title: sc.title,
        slug: sc.slug,
        subtitle: sc.subtitle,
        description: sc.descriptionHtml,
        shortDescription: sc.shortDescription,
        categoryId: category.id,
        instructorId: admin.id,
        level: sc.level,
        priceKes: sc.priceKes,
        salePriceKes: sc.salePriceKes ?? null,
        isFree: !!sc.isFree,
        thumbnailUrl: `https://picsum.photos/seed/${sc.slug}/800/450`,
        previewVideoUrl: videoUrl(videoCounter++),
        status: "PUBLISHED",
        isFeatured: !!sc.isFeatured,
        metaTitle: sc.title,
        metaDescription: sc.shortDescription,
        publishedAt: daysAgo(90),
        createdAt: daysAgo(120),
      },
    });

    await db.courseOutcome.createMany({
      data: sc.outcomes.map((text, i) => ({ courseId: course.id, text, sortOrder: i })),
    });
    await db.courseRequirement.createMany({
      data: sc.requirements.map((text, i) => ({ courseId: course.id, text, sortOrder: i })),
    });
    await db.courseAudience.createMany({
      data: sc.audience.map((text, i) => ({ courseId: course.id, text, sortOrder: i })),
    });

    const createdLessons: { id: string; type: string }[] = [];

    for (const [mi, mod] of sc.modules.entries()) {
      const createdModule = await db.module.create({
        data: { courseId: course.id, title: mod.title, description: mod.description, sortOrder: mi },
      });

      for (const [li, lesson] of mod.lessons.entries()) {
        const n = videoCounter++;
        let content: Record<string, unknown> = {};
        if (lesson.type === "VIDEO") {
          content = { videoUrl: videoUrl(n), captionUrl: captionUrl(n), transcript: "" };
        } else if (lesson.type === "READING") {
          content = { html: lesson.readingHtml ?? "<p></p>" };
        } else if (lesson.type === "RESOURCE") {
          content = { label: lesson.resource?.label ?? lesson.title, url: lesson.resource?.url ?? "#" };
        } else if (lesson.type === "QUIZ") {
          content = { instructions: "Answer all questions. You need 70% to pass and unlock the next lesson." };
        }

        const createdLesson = await db.lesson.create({
          data: {
            moduleId: createdModule.id,
            title: lesson.title,
            type: lesson.type,
            durationSeconds: (lesson.minutes ?? 5) * 60,
            content: JSON.stringify(content),
            isFreePreview: !!lesson.freePreview,
            sortOrder: li,
          },
        });
        createdLessons.push({ id: createdLesson.id, type: lesson.type });

        if (lesson.type === "QUIZ" && lesson.quiz) {
          for (const [qi, q] of lesson.quiz.entries()) {
            const createdQuestion = await db.quizQuestion.create({
              data: {
                lessonId: createdLesson.id,
                question: q.question,
                type: q.type,
                explanation: q.explanation,
                sortOrder: qi,
              },
            });
            await db.quizOption.createMany({
              data: q.options.map((o, oi) => ({
                questionId: createdQuestion.id,
                text: o.text,
                isCorrect: o.correct,
                sortOrder: oi,
              })),
            });
          }
        }
      }
    }

    return { ...course, lessons: createdLessons };
  }

  for (const sc of courses) {
    const created = await createCourse(sc);
    courseBySlug.set(sc.slug, created);
  }

  console.log("Enrolling learners + generating progress/payments...");

  async function enroll(
    userId: string,
    course: Awaited<ReturnType<typeof createCourse>>,
    opts: { progressPercent: number; source: "PURCHASE" | "FREE" | "MANUAL"; enrolledAt?: Date; paid?: boolean }
  ) {
    const enrolledAt = opts.enrolledAt ?? daysAgo(Math.floor(Math.random() * 300) + 1);
    const completedAt = opts.progressPercent >= 100 ? new Date(enrolledAt.getTime() + 3 * 86400000) : null;

    const enrollment = await db.enrollment.create({
      data: {
        userId,
        courseId: course.id,
        enrolledAt,
        completedAt,
        progressPercent: opts.progressPercent,
        source: opts.source,
      },
    });

    const lessonsToComplete = Math.floor((course.lessons.length * opts.progressPercent) / 100);
    for (let i = 0; i < course.lessons.length; i++) {
      const l = course.lessons[i];
      await db.lessonProgress.create({
        data: {
          enrollmentId: enrollment.id,
          lessonId: l.id,
          completed: i < lessonsToComplete,
          lastPositionSeconds: i === lessonsToComplete ? 45 : 0,
        },
      });
    }
    if (course.lessons[lessonsToComplete - 1]) {
      await db.enrollment.update({
        where: { id: enrollment.id },
        data: { lastLessonId: course.lessons[Math.max(0, lessonsToComplete - 1)].id },
      });
    }

    if (opts.paid && !course.isFree) {
      const amount = course.salePriceKes ?? course.priceKes;
      await db.payment.create({
        data: {
          userId,
          courseId: course.id,
          enrollmentId: enrollment.id,
          amountKes: amount,
          method: opts.source === "MANUAL" ? "MANUAL" : Math.random() > 0.5 ? "MPESA" : "CARD",
          status: "SUCCESS",
          reference: `MDEMO${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          createdAt: enrolledAt,
        },
      });
    } else if (course.isFree || opts.source === "FREE") {
      await db.payment.create({
        data: {
          userId,
          courseId: course.id,
          enrollmentId: enrollment.id,
          amountKes: 0,
          method: "FREE",
          status: "SUCCESS",
          createdAt: enrolledAt,
        },
      });
    }

    if (opts.progressPercent >= 100) {
      await db.certificate.create({ data: { enrollmentId: enrollment.id } });
    }

    return enrollment;
  }

  const endo = courseBySlug.get("endodontic-fundamentals")!;
  const composite = courseBySlug.get("composite-restorations-anterior-aesthetics")!;
  const pediatric = courseBySlug.get("pediatric-behavior-management")!;
  const anesthesia = courseBySlug.get("local-anesthesia-techniques-refresher")!;

  // The three named demo states from spec §10.
  await enroll(learner0.id, endo, { progressPercent: 0, source: "PURCHASE", paid: true, enrolledAt: daysAgo(1) });
  await enroll(learner40.id, composite, { progressPercent: 40, source: "PURCHASE", paid: true, enrolledAt: daysAgo(10) });
  await enroll(learner100.id, pediatric, { progressPercent: 100, source: "FREE", enrolledAt: daysAgo(45) });
  await db.wishlist.create({ data: { userId: learner0.id, courseId: composite.id } }).catch(() => {});
  await db.wishlist.create({ data: { userId: learner40.id, courseId: endo.id } }).catch(() => {});

  // Spread additional enrollments/payments across the year for chart data.
  const allCourses = [...courseBySlug.values()];
  for (const learner of fillerLearners) {
    const enrollCount = 1 + Math.floor(Math.random() * 3);
    const picked = new Set<string>();
    for (let i = 0; i < enrollCount; i++) {
      const course = allCourses[Math.floor(Math.random() * allCourses.length)];
      if (picked.has(course.id)) continue;
      picked.add(course.id);
      const progress = [0, 15, 40, 60, 85, 100][Math.floor(Math.random() * 6)];
      await enroll(learner.id, course, {
        progressPercent: progress,
        source: course.isFree ? "FREE" : "PURCHASE",
        paid: true,
        enrolledAt: daysAgo(Math.floor(Math.random() * 360)),
      }).catch(() => {});
    }
  }
  // A couple of manual (comp) enrollments for the admin "manual enroll" demo.
  await enroll(learner40.id, anesthesia, { progressPercent: 20, source: "MANUAL", enrolledAt: daysAgo(3) }).catch(() => {});

  console.log("Creating reviews...");
  for (const course of allCourses) {
    const reviewers = allLearners.filter(() => Math.random() > 0.55).slice(0, 4);
    for (const reviewer of reviewers) {
      const rating = [3, 4, 4, 5, 5, 5][Math.floor(Math.random() * 6)];
      await db.review
        .create({
          data: {
            userId: reviewer.id,
            courseId: course.id,
            rating,
            text: reviewsPool[Math.floor(Math.random() * reviewsPool.length)],
            createdAt: daysAgo(Math.floor(Math.random() * 200)),
          },
        })
        .catch(() => {});
    }
  }

  console.log("Creating coupons...");
  const specificCourses = allCourses.slice(0, 3);
  const welcome = await db.coupon.create({
    data: { code: "WELCOME10", discountType: "PERCENT", discountValue: 10, isActive: true },
  });
  const student500 = await db.coupon.create({
    data: { code: "STUDENT500", discountType: "FIXED", discountValue: 500, isActive: true },
  });
  await db.coupon.create({
    data: {
      code: "EXPIRED",
      discountType: "PERCENT",
      discountValue: 20,
      isActive: true,
      startsAt: daysAgo(60),
      endsAt: daysAgo(10),
    },
  });
  await db.couponCourse.createMany({
    data: specificCourses.map((c) => ({ couponId: student500.id, courseId: c.id })),
  });
  void welcome;

  console.log("Creating settings...");
  const settings: Record<string, unknown> = {
    general: {
      siteName: "Maronga Dental Academy",
      tagline: "Authoritative dental education from a practicing clinician",
      contactEmail: "hello@marongadental.ac.ke",
      phone: "+254 700 000 000",
      address: "Nairobi, Kenya",
      social: { facebook: "", instagram: "", linkedin: "", youtube: "" },
    },
    branding: { primaryColor: "#0f4c4c", secondaryColor: "#b08b2e", font: "Lora + Inter" },
    payments: {
      mpesaShortcode: "174379",
      mpesaConsumerKey: "stub-consumer-key",
      mpesaConsumerSecret: "stub-consumer-secret",
      stripePublishable: "pk_stub_000000",
      stripeSecret: "sk_stub_000000",
      usdKesRate: 129,
    },
    emailTemplates: {
      enrollmentConfirmation: {
        subject: "You're enrolled in {{course}}!",
        body: "Hi {{name}}, you're all set for {{course}}. Jump back in any time from your dashboard.",
      },
      welcome: {
        subject: "Welcome to Maronga Dental Academy",
        body: "Hi {{name}}, welcome aboard! Browse our courses to get started.",
      },
      passwordReset: {
        subject: "Reset your password",
        body: "Hi {{name}}, click the link to reset your password. This link expires in 1 hour.",
      },
      certificateIssued: {
        subject: "Your certificate for {{course}} is ready",
        body: "Congratulations {{name}}! Your certificate for {{course}} is ready to view and download.",
      },
    },
    legal: {
      terms: "<p>Placeholder Terms of Service. Replace with your reviewed legal copy before launch.</p>",
      privacy: "<p>Placeholder Privacy Policy. Replace with your reviewed legal copy before launch.</p>",
      refundPolicy: "<p>Placeholder Refund Policy. Replace with your reviewed legal copy before launch.</p>",
    },
    certificateTemplate: {
      primaryColor: "#0f4c4c",
      accentColor: "#b08b2e",
      signatureName: "Dr. Godfrey Maronga",
      signatureTitle: "Founder, Maronga Dental Academy",
    },
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.create({ data: { key, value: JSON.stringify(value) } });
  }

  console.log("Seeding testimonials as reviews-adjacent notification/contact/subscriber data...");
  await db.subscriber.createMany({
    data: [
      { email: "prospect1@example.com" },
      { email: "prospect2@example.com" },
      { email: "prospect3@example.com" },
    ],
  });

  await db.contactSubmission.createMany({
    data: [
      {
        name: "James Mwangi",
        email: "james.mwangi@example.com",
        subject: "Group discount for our clinic",
        message: "We have 6 dentists at our clinic — do you offer a group rate for the endodontics course?",
        status: "NEW",
        createdAt: daysAgo(2),
      },
      {
        name: "Nancy Wairimu",
        email: "nancy.w@example.com",
        subject: "Certificate accreditation",
        message: "Is the completion certificate recognized by the Kenya Dental Board for CPD points?",
        status: "READ",
        createdAt: daysAgo(6),
      },
    ],
  });

  await db.notification.createMany({
    data: [
      { type: "signup", payload: JSON.stringify({ name: learner0.name }), createdAt: daysAgo(2) },
      { type: "enrollment", payload: JSON.stringify({ course: "Endodontic Fundamentals" }), createdAt: daysAgo(1) },
      { type: "contact_submission", payload: JSON.stringify({ subject: "Group discount for our clinic" }), createdAt: daysAgo(2) },
    ],
  });

  console.log("Seed complete.");
  console.log(`Admin login: admin@demo.co.ke / ${DEMO_PASSWORD}`);
  console.log(`Learner logins: learner0@demo.co.ke, learner40@demo.co.ke, learner100@demo.co.ke / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
