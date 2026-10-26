import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DashboardNav from "@/components/dashboard/DashboardNav";
import CourseProgressCard from "@/components/dashboard/CourseProgressCard";
import CourseCard from "@/components/CourseCard";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { toCourseCard } from "@/lib/queries";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string; course?: string }>;
}) {
  const { tab = "courses", filter = "all", course: highlightSlug } = await searchParams;
  const user = await requireUser();

  return (
    <>
      <SiteHeader />
      {!user.emailVerifiedAt && <EmailVerifyBanner />}
      <main className="flex-1 bg-teal-50/20">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="font-serif text-3xl text-teal-900">My Dashboard</h1>
          <p className="mt-1 text-ink/70">Welcome back, {user.name.split(" ")[0]}.</p>

          <div className="mt-6">
            <DashboardNav active={tab} />
          </div>

          <div className="mt-8">
            {tab === "courses" && <MyCourses userId={user.id} filter={filter} highlightSlug={highlightSlug} />}
            {tab === "wishlist" && <Wishlist userId={user.id} />}
            {tab === "certificates" && <Certificates userId={user.id} />}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function MyCourses({ userId, filter, highlightSlug }: { userId: string; filter: string; highlightSlug?: string }) {
  const enrollments = await db.enrollment.findMany({
    where: { userId, status: "ACTIVE", course: { deletedAt: null } },
    include: { course: true },
    orderBy: { enrolledAt: "desc" },
  });

  const filtered = enrollments.filter((e) => {
    if (filter === "in-progress") return e.progressPercent < 100;
    if (filter === "completed") return e.progressPercent >= 100;
    return true;
  });

  if (enrollments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-teal-200 bg-white px-6 py-16 text-center">
        <p className="font-serif text-xl text-teal-900">No courses yet</p>
        <p className="mt-2 text-sm text-ink/70">Browse the catalog to start your first course.</p>
        <Link href="/courses" className="mt-4 inline-block rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white">
          Browse courses
        </Link>
      </div>
    );
  }

  return (
    <div>
      {highlightSlug && (
        <p className="mb-4 rounded-xl bg-teal-50 px-4 py-2 text-sm text-teal-700">
          Your enrollment was saved — jump back into it below.
        </p>
      )}
      <div className="mb-4 flex gap-2 text-sm">
        {[
          { key: "all", label: "All" },
          { key: "in-progress", label: "In progress" },
          { key: "completed", label: "Completed" },
        ].map((f) => (
          <Link
            key={f.key}
            href={`/dashboard?tab=courses&filter=${f.key}`}
            className={`rounded-full px-3 py-1.5 ${filter === f.key ? "bg-teal-600 text-white" : "bg-white text-ink/70 hover:bg-teal-50"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <CourseProgressCard
            key={e.id}
            slug={e.course.slug}
            title={e.course.title}
            thumbnailUrl={e.course.thumbnailUrl}
            progressPercent={e.progressPercent}
            lastLessonId={e.lastLessonId}
            completed={e.progressPercent >= 100}
          />
        ))}
      </div>
    </div>
  );
}

async function Wishlist({ userId }: { userId: string }) {
  const items = await db.wishlist.findMany({
    where: { userId },
    include: {
      course: {
        include: {
          category: true,
          instructor: { select: { name: true } },
          modules: { include: { lessons: { select: { durationSeconds: true } } } },
          reviews: { where: { status: "PUBLISHED", deletedAt: null }, select: { rating: true } },
          _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  if (items.length === 0) {
    return <p className="text-sm text-ink/70">Your wishlist is empty. Tap the heart on any course to save it here.</p>;
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <CourseCard key={item.courseId} course={toCourseCard(item.course)} />
      ))}
    </div>
  );
}

async function Certificates({ userId }: { userId: string }) {
  const certificates = await db.certificate.findMany({
    where: { enrollment: { userId, status: "ACTIVE" }, revokedAt: null },
    include: { enrollment: { include: { course: true } } },
    orderBy: { issuedAt: "desc" },
  });

  if (certificates.length === 0) {
    return <p className="text-sm text-ink/70">Complete a course to earn your first certificate.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {certificates.map((cert) => (
        <div key={cert.id} className="flex items-center justify-between rounded-2xl border border-teal-100 bg-white p-5">
          <div>
            <p className="font-serif text-teal-900">{cert.enrollment.course.title}</p>
            <p className="text-sm text-ink/70">Issued {formatDate(cert.issuedAt)}</p>
          </div>
          <Link href={`/certificates/${cert.id}`} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            View
          </Link>
        </div>
      ))}
    </div>
  );
}

