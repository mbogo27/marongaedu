import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getInstructor, getSetting } from "@/lib/settings";
import { getInstructorStats } from "@/lib/queries";

export default async function AboutPage() {
  const instructor = await getInstructor();
  const general = await getSetting("general");
  const stats = instructor ? await getInstructorStats(instructor.id) : null;

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="border-b border-teal-100 bg-teal-50/40">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-[240px_1fr]">
            <div className="relative mx-auto aspect-square w-48 overflow-hidden rounded-full border-4 border-white shadow-lg md:mx-0 md:w-full">
              <Image src={instructor?.avatarUrl ?? "/maronga.jpg"} alt={instructor?.name ?? "Instructor"} fill className="object-cover" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-gold-800">About {general.siteName}</p>
              <h1 className="mt-2 font-serif text-4xl text-teal-900">{instructor?.name}</h1>
              <p className="mt-3 max-w-2xl text-ink/70">{instructor?.bio}</p>
              {stats && (
                <div className="mt-6 flex flex-wrap gap-8 text-sm">
                  <div>
                    <p className="font-serif text-2xl text-teal-900">{stats.courseCount}</p>
                    <p className="text-ink/70">Courses taught</p>
                  </div>
                  <div>
                    <p className="font-serif text-2xl text-teal-900">{stats.totalStudents}</p>
                    <p className="text-ink/70">Students taught</p>
                  </div>
                  <div>
                    <p className="font-serif text-2xl text-teal-900">
                      {stats.rating.count > 0 ? stats.rating.avg.toFixed(1) : "—"}
                    </p>
                    <p className="text-ink/70">Average rating</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl space-y-6 px-6 py-16 text-ink/80">
          <h2 className="font-serif text-2xl text-teal-900">Our mission</h2>
          <p>
            {general.siteName} exists to make authoritative, practical dental education accessible to students and
            practicing clinicians across Kenya. Every course is built from real clinical experience — not recycled
            textbook material — so what you learn holds up the next time you&apos;re at the chairside.
          </p>
          <h2 className="font-serif text-2xl text-teal-900">Clinic information</h2>
          <p>
            {instructor?.name} practices at a private dental clinic in {general.address}. Course content draws
            directly from cases seen in that practice.
          </p>
          <div className="rounded-2xl border border-teal-100 bg-white p-6">
            <p className="text-sm text-ink/70">Have a question before enrolling?</p>
            <Link href="/contact" className="mt-2 inline-block font-medium text-teal-700 hover:underline">
              Get in touch →
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
