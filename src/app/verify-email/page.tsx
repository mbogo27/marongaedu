import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/dal";
import { verifyEmailToken } from "@/lib/auth/email-verification";
import ResendVerification from "@/components/ResendVerification";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

const btn = "inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const [result, user] = await Promise.all([verifyEmailToken(token), getCurrentUser()]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="max-w-md">
          {result.ok ? (
            <>
              <h1 className="font-serif text-2xl text-teal-900">Email verified</h1>
              <p className="mt-2 text-ink/80">
                Your email is confirmed. You can now download certificates and write reviews.
              </p>
              <div className="mt-6">
                <Link href={user ? "/dashboard" : "/login"} className={btn}>
                  {user ? "Go to dashboard" : "Log in"}
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-teal-900">
                {result.state === "expired" ? "Link expired" : result.state === "used" ? "Link already used" : "Link not valid"}
              </h1>
              <p className="mt-2 text-ink/80">
                {result.state === "used"
                  ? "This verification link was already used. If you can log in, your email may already be verified."
                  : "Verification links expire after 24 hours and work once."}
              </p>
              <div className="mt-6">
                {user ? (
                  user.emailVerifiedAt ? (
                    <Link href="/dashboard" className={btn}>
                      Go to dashboard
                    </Link>
                  ) : (
                    <ResendVerification />
                  )
                ) : (
                  <Link href="/login?redirect=/verify-email" className={btn}>
                    Log in to get a new link
                  </Link>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
