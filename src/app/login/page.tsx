import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LoginForm from "@/components/LoginForm";
import GoogleButton from "@/components/GoogleButton";
import { env } from "@/lib/env";
import { safeRedirect } from "@/lib/request";

export const metadata: Metadata = { title: "Log in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; reset?: string; changed?: string }>;
}) {
  const { redirect: redirectTo, reset, changed } = await searchParams;
  const safe = redirectTo ? safeRedirect(redirectTo, "") : "";

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        {reset === "success" && (
          <p role="status" className="mb-4 rounded-full bg-teal-50 px-4 py-2 text-sm text-teal-800">
            Password reset. Log in with your new password.
          </p>
        )}
        {changed === "1" && (
          <p role="status" className="mb-4 rounded-full bg-teal-50 px-4 py-2 text-sm text-teal-800">
            Your account was updated. Please log in again.
          </p>
        )}
        <LoginForm
          redirectTo={safe || undefined}
          socialSlot={<GoogleButton redirectTo={safe || undefined} />}
          hint={
            env.NODE_ENV !== "production" ? (
              <p className="mt-6 text-center text-xs text-ink/70">
                Demo accounts use password <code className="rounded bg-teal-50 px-1 py-0.5 text-teal-800">Demo@1234</code>{" "}
                (see README).
              </p>
            ) : null
          }
        />
      </main>
      <SiteFooter />
    </>
  );
}
