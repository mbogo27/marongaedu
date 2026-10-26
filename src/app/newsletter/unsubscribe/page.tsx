import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const res = token ? await db.subscriber.updateMany({ where: { unsubscribeToken: token }, data: { unsubscribedAt: new Date() } }) : { count: 0 };
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="max-w-md">
          <h1 className="font-serif text-2xl text-teal-900">{res.count ? "You've been unsubscribed" : "Link not valid"}</h1>
          <p className="mt-2 text-ink/80">{res.count ? "You will no longer receive our newsletter." : "We couldn't find that subscription."}</p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
            Back to home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
