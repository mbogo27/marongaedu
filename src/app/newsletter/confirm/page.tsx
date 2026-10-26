import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { db } from "@/lib/db";
import { consumeToken } from "@/lib/auth/verification";

export const metadata: Metadata = { title: "Confirm subscription", robots: { index: false } };

export default async function ConfirmNewsletterPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const consumed = await consumeToken(token, "NEWSLETTER_OPTIN");
  let ok = false;
  if (consumed.ok) {
    const res = await db.subscriber.updateMany({ where: { email: consumed.token.identifier }, data: { confirmedAt: new Date(), unsubscribedAt: null } });
    ok = res.count > 0;
  }
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="max-w-md">
          <h1 className="font-serif text-2xl text-teal-900">{ok ? "You're subscribed" : "Link not valid"}</h1>
          <p className="mt-2 text-ink/80">{ok ? "Thanks for confirming. You'll hear from us about new courses." : "This confirmation link has expired or was already used."}</p>
          <Link href="/" className="mt-6 inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
            Back to home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
