import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ResetPasswordForm from "@/components/ResetPasswordForm";
import { inspectToken } from "@/lib/auth/verification";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const { state } = await inspectToken(token, "RESET_PASSWORD");

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        {state === "valid" && token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="max-w-md rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-sm">
            <h1 className="font-serif text-2xl text-teal-900">This link can&apos;t be used</h1>
            <p className="mt-3 text-ink/80">
              {state === "used"
                ? "This reset link has already been used."
                : state === "expired"
                  ? "This reset link has expired."
                  : "This reset link is not valid."}{" "}
              Request a new one to continue.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Send a new link
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
