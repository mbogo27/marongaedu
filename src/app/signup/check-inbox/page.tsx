import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { safeRedirect } from "@/lib/request";

export const metadata: Metadata = { title: "Check your inbox", robots: { index: false } };

/**
 * Shown after every sign-up attempt, whether or not the email already had an
 * account, so the response never reveals which (spec §3.2, no enumeration).
 */
export default async function CheckInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;
  const next = redirectTo ? safeRedirect(redirectTo, "") : "";
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="max-w-md rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-2xl text-teal-900">Check your inbox</h1>
          <p className="mt-3 text-ink/80">
            We&apos;ve sent an email to the address you entered. If it&apos;s a new account, open the link inside to
            verify your email, then log in. If you already had an account, the email explains how to sign in or reset
            your password.
          </p>
          <Link
            href={next ? `/login?redirect=${encodeURIComponent(next)}` : "/login"}
            className="mt-6 inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Go to log in
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
