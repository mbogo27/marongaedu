import { notFound, permanentRedirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LevelBadge from "@/components/LevelBadge";
import PreviewPlayer from "@/components/PreviewPlayer";
import CurriculumAccordion from "@/components/CurriculumAccordion";
import EnrollButton from "@/components/EnrollButton";
import ShareButtons from "@/components/ShareButtons";
import StickyEnrollBar from "@/components/StickyEnrollBar";
import ReviewsSection from "@/components/ReviewsSection";
import CourseCard from "@/components/CourseCard";
import { getCourseDetail, getRelatedCourses, getInstructorStats, resolveSlugRedirect } from "@/lib/queries";
import { formatKes, formatDuration, formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getEnrollmentGate } from "@/lib/enrollment";
import { resolveVideoReference } from "@/lib/content-types";
import { sanitizeRichText, stripHtml } from "@/lib/sanitize";
import { getSetting } from "@/lib/settings";
import { track } from "@/lib/analytics";
import { t } from "@/lib/i18n";

const REVIEWS_PER_PAGE = 10;

// Only echo known messages back from the query string (no content spoofing via ?enrollError=…).
const KNOWN_ENROLL_ERRORS = new Set([t("enroll.sold_out"), t("enroll.closed"), t("enroll.not_open"), t("enroll.already"), t("checkout.course_not_found")]);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseDetail(slug);
  if (!course) return {};
  const image = course.ogImageUrl ?? course.thumbnailUrl;
  return {
    title: course.metaTitle ?? course.title,
    description: course.metaDescription ?? stripHtml(course.shortDescription),
    alternates: { canonical: `/courses/${course.slug}` },
    openGraph: { title: course.metaTitle ?? course.title, description: course.metaDescription ?? course.shortDescription, images: image ? [image] : [], type: "website" },
  };
}

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ enrollError?: string; reviews?: string }>;
}) {
  const { slug } = await params;
  const { enrollError, reviews: reviewsParam } = await searchParams;
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  const course = await getCourseDetail(slug, { includeUnpublished: isAdmin });
  if (!course) {
    const moved = await resolveSlugRedirect(slug);
    if (moved) permanentRedirect(`/courses/${moved}`);
    notFound();
  }
  const isDraft = course.status !== "PUBLISHED" || !!course.deletedAt;

  if (!isDraft) track("course_viewed", { slug });

  const [related, instructorStats, general, reviewSettings, gate] = await Promise.all([
    getRelatedCourses(course.categoryId, course.id, 4),
    getInstructorStats(course.instructorId),
    getSetting("general"),
    getSetting("reviews"),
    getEnrollmentGate(course, user?.id ?? null),
  ]);

  let isWishlisted = false;
  let enrollmentProgress = 0;
  if (user) {
    const [wishlist, enrollment] = await Promise.all([
      db.wishlist.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } }),
      db.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: course.id } } }),
    ]);
    isWishlisted = !!wishlist;
    enrollmentProgress = enrollment?.status === "ACTIVE" ? enrollment.progressPercent : 0;
  }

  // Who may review: enrolled + verified (+ minimum progress if the admin set one).
  const enrolled = gate === "enrolled";
  let canReview = false;
  let reviewBlockedReason: string | undefined;
  if (enrolled && user) {
    if (!user.emailVerifiedAt) reviewBlockedReason = t("review.verify_first");
    else if (enrollmentProgress < reviewSettings.minProgressPercent) {
      reviewBlockedReason = t("review.progress_required", { percent: reviewSettings.minProgressPercent });
    } else canReview = true;
  }

  const intro = resolveVideoReference(course.previewVideoUrl);
  const description = sanitizeRichText(course.description);
  const reviewLimit = Math.max(REVIEWS_PER_PAGE, Number(reviewsParam) || REVIEWS_PER_PAGE);
  const shownReviews = course.reviews.slice(0, reviewLimit);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: stripHtml(course.shortDescription),
    url: `${env.APP_URL}/courses/${course.slug}`,
    image: course.thumbnailUrl || undefined,
    provider: { "@type": "Organization", name: general.siteName, sameAs: env.APP_URL },
    instructor: { "@type": "Person", name: course.instructor.name },
    offers: { "@type": "Offer", price: course.effectivePriceKes, priceCurrency: "KES", availability: "https://schema.org/InStock" },
    ...(course.rating.count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: course.rating.avg.toFixed(1), reviewCount: course.rating.count } }
      : {}),
  };
  // "<" is escaped so course text can never close the script tag.
  const jsonLdHtml = JSON.stringify(jsonLd).replace(/</g, "\\u003c");

  return (
    <>
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml }} />
      {isDraft && (
        <div role="status" className="bg-gold-500 px-4 py-2 text-center text-sm font-semibold text-teal-900">
          Draft preview — this course is {course.status.toLowerCase()} and not visible to the public.
        </div>
      )}
      <main id="main" className="flex-1">
        <section className="border-b border-teal-100 bg-teal-50/40">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div>
              <nav aria-label="Breadcrumb" className="mb-3 text-sm text-ink/70">
                <Link href="/courses" className="hover:text-teal-800 hover:underline">Courses</Link>
                {" / "}
                <Link href={`/categories/${course.category.slug}`} className="hover:text-teal-800 hover:underline">{course.category.name}</Link>
              </nav>
              <h1 className="font-serif text-3xl leading-tight text-teal-900 sm:text-4xl">{course.title}</h1>
              {course.subtitle && <p className="mt-2 text-lg text-ink/80">{course.subtitle}</p>}

              <p className="mt-4 text-sm text-ink/80">
                Created by{" "}
                <Link href="/about" className="font-medium text-teal-800 hover:underline">
                  {course.instructor.name}
                </Link>
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink/70">
                <LevelBadge level={course.level} />
                <span>{formatDuration(course.durationSeconds)}</span>
                <span>{course.lessonCount} lessons</span>
                <span>Updated {formatDate(course.updatedAt)}</span>
                {course.rating.count > 0 && (
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-gold-500" aria-hidden="true">
                      <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
                    </svg>
                    {course.rating.avg.toFixed(1)} ({course.rating.count} reviews)
                  </span>
                )}
                <span>{course.enrollmentCount} enrolled</span>
              </div>
            </div>

            <div>
              {intro ? (
                <PreviewPlayer source={intro.source} src={intro.src} posterUrl={course.thumbnailUrl} title={course.title} />
              ) : (
                course.thumbnailUrl && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-teal-900">
                    <Image src={course.thumbnailUrl} alt="" fill sizes="420px" className="object-cover" />
                  </div>
                )
              )}
              <div className="mt-4 rounded-2xl border border-teal-100 bg-white p-5">
                <div className="mb-4 flex items-baseline gap-2">
                  {course.effectivePriceKes === 0 ? (
                    <span className="font-serif text-2xl text-teal-900">Free</span>
                  ) : (
                    <>
                      <span className="font-serif text-2xl text-teal-900">{formatKes(course.effectivePriceKes)}</span>
                      {course.effectivePriceKes < course.priceKes && (
                        <span className="text-sm text-ink/70 line-through">{formatKes(course.priceKes)}</span>
                      )}
                    </>
                  )}
                </div>
                {enrollError && KNOWN_ENROLL_ERRORS.has(enrollError) && (
                  <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {enrollError}
                  </p>
                )}
                <EnrollButton
                  slug={course.slug}
                  courseId={course.id}
                  title={course.title}
                  priceKes={course.priceKes}
                  effectivePriceKes={course.effectivePriceKes}
                  isFree={course.isFree}
                  gate={gate}
                  isWishlisted={isWishlisted}
                />
                <div className="mt-4">
                  <ShareButtons title={course.title} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <StickyEnrollBar
          slug={course.slug}
          title={course.title}
          isFree={course.isFree}
          effectivePriceKes={course.effectivePriceKes}
          gate={gate}
        />

        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 space-y-10">
              {course.outcomes.length > 0 && (
                <section aria-labelledby="learn-h">
                  <h2 id="learn-h" className="font-serif text-2xl text-teal-900">What you&apos;ll learn</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {course.outcomes.map((o) => (
                      <li key={o.id} className="flex items-start gap-2 text-sm text-ink/80">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 fill-teal-700" aria-hidden="true">
                          <path d="M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z" />
                        </svg>
                        {o.text}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {course.requirements.length > 0 && (
                <section aria-labelledby="req-h">
                  <h2 id="req-h" className="font-serif text-2xl text-teal-900">Requirements</h2>
                  <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-ink/80">
                    {course.requirements.map((r) => (
                      <li key={r.id}>{r.text}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section aria-labelledby="desc-h">
                <h2 id="desc-h" className="font-serif text-2xl text-teal-900">Description</h2>
                <div
                  className="mt-4 max-w-none text-sm leading-relaxed text-ink/80 [&_a]:text-teal-800 [&_a]:underline [&_h2]:mt-5 [&_h2]:font-serif [&_h2]:text-lg [&_h3]:mt-4 [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              </section>

              {course.audience.length > 0 && (
                <section aria-labelledby="aud-h">
                  <h2 id="aud-h" className="font-serif text-2xl text-teal-900">Who this course is for</h2>
                  <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-ink/80">
                    {course.audience.map((a) => (
                      <li key={a.id}>{a.text}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <CurriculumAccordion
                  posterUrl={course.thumbnailUrl}
                  modules={course.modules.map((m) => ({
                    id: m.id,
                    title: m.title,
                    description: m.description,
                    lessons: m.lessons.map((l) => ({
                      id: l.id,
                      title: l.title,
                      type: l.type,
                      durationSeconds: l.durationSeconds,
                      isFreePreview: l.isFreePreview,
                    })),
                  }))}
                />
              </section>

              <div id="reviews">
                <ReviewsSection
                  courseId={course.id}
                  slug={course.slug}
                  reviews={shownReviews}
                  rating={course.rating}
                  viewerId={user?.id ?? null}
                  canReview={canReview}
                  reviewBlockedReason={reviewBlockedReason}
                />
                {course.reviews.length > shownReviews.length && (
                  <Link
                    href={`/courses/${course.slug}?reviews=${reviewLimit + REVIEWS_PER_PAGE}#reviews`}
                    scroll={false}
                    className="mt-4 inline-block rounded-full border border-teal-300 px-5 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50"
                  >
                    Load more reviews
                  </Link>
                )}
              </div>
            </div>

            <aside aria-label="Instructor">
              <div className="rounded-2xl border border-teal-100 bg-white p-6">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
                    <Image src={course.instructor.avatarUrl ?? "/maronga.jpg"} alt={course.instructor.name} fill sizes="64px" className="object-cover" />
                  </div>
                  <div>
                    <p className="font-serif text-lg text-teal-900">{course.instructor.name}</p>
                    <p className="text-sm text-ink/70">Instructor, {general.siteName}</p>
                  </div>
                </div>
                {course.instructor.bio && <p className="mt-4 text-sm text-ink/80">{course.instructor.bio}</p>}
                <dl className="mt-4 flex gap-6 text-sm">
                  <div>
                    <dd className="font-semibold text-ink">{instructorStats.courseCount}</dd>
                    <dt className="text-ink/70">Courses</dt>
                  </div>
                  <div>
                    <dd className="font-semibold text-ink">{instructorStats.totalStudents}</dd>
                    <dt className="text-ink/70">Students</dt>
                  </div>
                  <div>
                    <dd className="font-semibold text-ink">{instructorStats.rating.count > 0 ? instructorStats.rating.avg.toFixed(1) : "—"}</dd>
                    <dt className="text-ink/70">Rating</dt>
                  </div>
                </dl>
              </div>
            </aside>
          </div>

          {related.length > 0 && (
            <section className="mt-16" aria-labelledby="related-h">
              <h2 id="related-h" className="mb-6 font-serif text-2xl text-teal-900">Related courses</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
