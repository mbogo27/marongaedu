import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import DashboardNav from "@/components/dashboard/DashboardNav";
import CourseProgressCard from "@/components/dashboard/CourseProgressCard";
import CourseCard from "@/components/CourseCard";
import AccountPanel from "@/components/dashboard/AccountPanel";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { formatKes, formatDate } from "@/lib/format";
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
      {!user.verifiedAt && <EmailVerifyBanner />}
      <main className="flex-1 bg-teal-50/20">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <h1 className="font-serif text-3xl text-teal-900">My Dashboard</h1>
          <p className="mt-1 text-ink/60">Welcome back, {user.name.split(" ")[0]}.</p>

          <div className="mt-6">
            <DashboardNav active={tab} />
          </div>

          <div className="mt-8">
            {tab === "courses" && <MyCourses userId={user.id} filter={filter} highlightSlug={highlightSlug} />}
            {tab === "wishlist" && <Wishlist userId={user.id} />}
            {tab === "certificates" && <Certificates userId={user.id} />}
            {tab === "purchases" && <PurchaseHistory userId={user.id} />}
            {tab === "account" && (
              <AccountPanel name={user.name} bio={user.bio} notifyEmail={user.notifyEmail} notifyMarketing={user.notifyMarketing} />
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

async function MyCourses({ userId, filter, highlightSlug }: { userId: string; filter: string; highlightSlug?: string }) {
  const enrollments = await db.enrollment.findMany({
    where: { userId },
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
        <p className="mt-2 text-sm text-ink/60">Browse the catalog to start your first course.</p>
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
            className={`rounded-full px-3 py-1.5 ${filter === f.key ? "bg-teal-600 text-white" : "bg-white text-ink/60 hover:bg-teal-50"}`}
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
          modules: { include: { lessons: { select: { durationSeconds: true } } } },
          reviews: { where: { status: "PUBLISHED" }, select: { rating: true } },
          _count: { select: { enrollments: true } },
        },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  if (items.length === 0) {
    return <p className="text-sm text-ink/60">Your wishlist is empty. Tap the heart on any course to save it here.</p>;
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
    where: { enrollment: { userId } },
    include: { enrollment: { include: { course: true } } },
    orderBy: { issuedAt: "desc" },
  });

  if (certificates.length === 0) {
    return <p className="text-sm text-ink/60">Complete a course to earn your first certificate.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {certificates.map((cert) => (
        <div key={cert.id} className="flex items-center justify-between rounded-2xl border border-teal-100 bg-white p-5">
          <div>
            <p className="font-serif text-teal-900">{cert.enrollment.course.title}</p>
            <p className="text-sm text-ink/50">Issued {formatDate(cert.issuedAt)}</p>
          </div>
          <Link href={`/certificates/${cert.id}`} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            View
          </Link>
        </div>
      ))}
    </div>
  );
}

async function PurchaseHistory({ userId }: { userId: string }) {
  const payments = await db.payment.findMany({
    where: { userId },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  if (payments.length === 0) {
    return <p className="text-sm text-ink/60">No purchases yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-teal-100 bg-white">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-teal-100 text-left text-ink/50">
          <tr>
            <th className="px-4 py-3 font-medium">Course</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Method</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Invoice</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-teal-50">
          {payments.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 text-ink">{p.course.title}</td>
              <td className="px-4 py-3 text-ink/60">{formatDate(p.createdAt)}</td>
              <td className="px-4 py-3 text-ink/60">{formatKes(p.amountKes)}</td>
              <td className="px-4 py-3 text-ink/60">{p.method}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === "SUCCESS"
                      ? "bg-teal-50 text-teal-700"
                      : p.status === "FAILED"
                        ? "bg-red-50 text-red-600"
                        : "bg-gold-50 text-gold-700"
                  }`}
                >
                  {p.status}
                </span>
              </td>
              <td className="px-4 py-3">
                {p.status === "SUCCESS" ? (
                  <a href={`/invoices/${p.id}`} className="text-teal-700 hover:underline">
                    Download
                  </a>
                ) : (
                  <span className="text-ink/30">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
