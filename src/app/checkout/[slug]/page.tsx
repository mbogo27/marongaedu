import { notFound, redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CheckoutForm from "@/components/CheckoutForm";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { effectivePrice } from "@/lib/queries";
import { getSetting, type PaymentSettings } from "@/lib/settings";

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();

  const course = await db.course.findUnique({ where: { slug } });
  if (!course) notFound();
  if (course.isFree) redirect(`/courses/${slug}`);

  const existing = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  if (existing) redirect(`/learn/${slug}`);

  const payments = await getSetting<PaymentSettings>("payments");

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="font-serif text-3xl text-teal-900">Checkout</h1>
          <p className="mt-2 text-ink/70">You&apos;re enrolling in {course.title}.</p>
          <div className="mt-8">
            <CheckoutForm
              slug={course.slug}
              courseId={course.id}
              title={course.title}
              thumbnailUrl={course.thumbnailUrl}
              priceKes={effectivePrice(course)}
              usdRate={payments.usdKesRate}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
