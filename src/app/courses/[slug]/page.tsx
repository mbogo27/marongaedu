import { notFound } from "next/navigation";
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
import { getCourseDetail, getRelatedCourses, getInstructorStats } from "@/lib/queries";
import { formatKes, formatDuration, formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { track } from "@/lib/analytics";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseDetail(slug);
  if (!course) return {};
  return {
    title: course.metaTitle ?? course.title,
    description: course.metaDescription ?? course.shortDescription,
    openGraph: { images: [course.ogImageUrl ?? course.thumbnailUrl] },
  };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseDetail(slug);
  if (!course) notFound();

  track("course_viewed", { slug });

  const [user, related, instructorStats] = await Promise.all([
    getCurrentUser(),
    getRelatedCourses(course.categoryId, course.id, 4),
    getInstructorStats(course.instructorId),
  ]);

  let isEnrolled = false;
  let isWishlisted = false;
  let alreadyReviewed = false;
  if (user) {
    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    isEnrolled = !!enrollment;
    const wishlist = await db.wishlist.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    isWishlisted = !!wishlist;
    if (isEnrolled) {
      const existingReview = await db.review.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: course.id } },
      });
      alreadyReviewed = !!existingReview;
    }
  }

  const previewLesson = course.modules.flatMap((m) => m.lessons).find((l) => l.isFreePreview && l.type === "VIDEO");
  const previewContent = previewLesson ? JSON.parse(previewLesson.content) : { videoUrl: course.previewVideoUrl };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.shortDescription,
    provider: { "@type": "Organization", name: "Maronga Dental Academy" },
    offers: { "@type": "Offer", price: course.effectivePriceKes, priceCurrency: "KES" },
    aggregateRating:
      course.rating.count > 0
        ? { "@type": "AggregateRating", ratingValue: course.rating.avg.toFixed(1), reviewCount: course.rating.count }
        : undefined,
  };

  return (
    <>
      <SiteHeader />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="flex-1">
        <section className="border-b border-teal-100 bg-teal-50/40">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[1fr_420px]">
            <div>
              <nav className="mb-3 text-sm text-ink/50">
                <Link href="/courses" className="hover:text-teal-700">Courses</Link>
                {" / "}
                <Link href={`/categories/${course.category.slug}`} className="hover:text-teal-700">{course.category.name}</Link>
              </nav>
              <h1 className="font-serif text-3xl leading-tight text-teal-900 sm:text-4xl">{course.title}</h1>
              {course.subtitle && <p className="mt-2 text-lg text-ink/70">{course.subtitle}</p>}

              <p className="mt-4 text-sm text-ink/70">
                Created by{" "}
                <Link href="/about" className="font-medium text-teal-700 hover:underline">
                  {course.instructor.name}
                </Link>
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink/60">
                <LevelBadge level={course.level} />
                <span>{formatDuration(course.durationSeconds)}</span>
                <span>{course.lessonCount} lessons</span>
                <span>Updated {formatDate(course.updatedAt)}</span>
                {course.rating.count > 0 && (
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-gold-500">
                      <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
                    </svg>
                    {course.rating.avg.toFixed(1)} ({course.rating.count} reviews)
                  </span>
                )}
                <span>{course.enrollmentCount} enrolled</span>
              </div>
            </div>

            <div>
              <PreviewPlayer
                src={previewContent.videoUrl}
                captionUrl={previewContent.captionUrl}
                posterUrl={course.thumbnailUrl}
                title={course.title}
              />
              <div className="mt-4 rounded-2xl border border-teal-100 bg-white p-5">
                <div className="mb-4 flex items-baseline gap-2">
                  {course.isFree ? (
                    <span className="font-serif text-2xl text-teal-900">Free</span>
                  ) : (
                    <>
                      <span className="font-serif text-2xl text-teal-900">{formatKes(course.effectivePriceKes)}</span>
                      {course.effectivePriceKes < course.priceKes && (
                        <span className="text-sm text-ink/40 line-through">{formatKes(course.priceKes)}</span>
                      )}
                    </>
                  )}
                </div>
                <EnrollButton
                  slug={course.slug}
                  courseId={course.id}
                  title={course.title}
                  priceKes={course.priceKes}
                  effectivePriceKes={course.effectivePriceKes}
                  isFree={course.isFree}
                  isEnrolled={isEnrolled}
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
          isEnrolled={isEnrolled}
        />

        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_420px]">
            <div className="space-y-10">
              {course.outcomes.length > 0 && (
                <section>
                  <h2 className="font-serif text-2xl text-teal-900">What you&apos;ll learn</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {course.outcomes.map((o) => (
                      <div key={o.id} className="flex items-start gap-2 text-sm text-ink/80">
                        <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 fill-teal-600">
                          <path d="M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z" />
                        </svg>
                        {o.text}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {course.requirements.length > 0 && (
                <section>
                  <h2 className="font-serif text-2xl text-teal-900">Requirements</h2>
                  <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-ink/80">
                    {course.requirements.map((r) => (
                      <li key={r.id}>{r.text}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h2 className="font-serif text-2xl text-teal-900">Description</h2>
                <div
                  className="prose prose-teal mt-4 max-w-none text-sm text-ink/80 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{ __html: course.description }}
                />
              </section>

              {course.audience.length > 0 && (
                <section>
                  <h2 className="font-serif text-2xl text-teal-900">Who this course is for</h2>
                  <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-ink/80">
                    {course.audience.map((a) => (
                      <li key={a.id}>{a.text}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <CurriculumAccordion
                  modules={course.modules}
                  posterUrl={course.thumbnailUrl}
                />
              </section>

              <ReviewsSection
                courseId={course.id}
                slug={course.slug}
                reviews={course.reviews}
                rating={course.rating}
                canReview={isEnrolled}
                alreadyReviewed={alreadyReviewed}
              />
            </div>

            <aside>
              <div className="rounded-2xl border border-teal-100 bg-white p-6">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
                    <Image src={course.instructor.avatarUrl ?? "/maronga.jpg"} alt={course.instructor.name} fill className="object-cover" />
                  </div>
                  <div>
                    <p className="font-serif text-lg text-teal-900">{course.instructor.name}</p>
                    <p className="text-sm text-ink/50">Founder, Maronga Dental Academy</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-ink/70">{course.instructor.bio}</p>
                <div className="mt-4 flex gap-6 text-sm">
                  <div>
                    <p className="font-semibold text-ink">{instructorStats.courseCount}</p>
                    <p className="text-ink/50">Courses</p>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{instructorStats.totalStudents}</p>
                    <p className="text-ink/50">Students</p>
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{instructorStats.rating.count > 0 ? instructorStats.rating.avg.toFixed(1) : "—"}</p>
                    <p className="text-ink/50">Rating</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="mb-6 font-serif text-2xl text-teal-900">Related courses</h2>
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
