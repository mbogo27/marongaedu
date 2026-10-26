import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CheckoutForm from "@/components/CheckoutForm";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { effectivePrice } from "@/lib/domain/pricing";
import { getEnrollmentGate } from "@/lib/enrollment";
import { getUsdRate } from "@/lib/settings";
import { isSimulatedPayments } from "@/lib/payments";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/checkout/${slug}`);

  const course = await db.course.findFirst({ where: { slug, status: "PUBLISHED", deletedAt: null } });
  if (!course) notFound();
  if (effectivePrice(course) === 0) redirect(`/courses/${slug}`);

  const gate = await getEnrollmentGate(course, user.id);
  if (gate === "enrolled") redirect(`/learn/${slug}`);
  if (gate !== "open") redirect(`/courses/${slug}`);

  const usdRate = await getUsdRate();

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="font-serif text-3xl text-teal-900">Checkout</h1>
          <p className="mt-2 text-ink/80">You&apos;re enrolling in {course.title}.</p>
          <div className="mt-8">
            <CheckoutForm
              slug={course.slug}
              title={course.title}
              thumbnailUrl={course.thumbnailUrl}
              priceKes={effectivePrice(course)}
              usdRate={usdRate}
              simulated={isSimulatedPayments()}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
