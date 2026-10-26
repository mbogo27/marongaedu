import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SignupForm from "@/components/SignupForm";
import GoogleButton from "@/components/GoogleButton";
import TurnstileWidget from "@/components/TurnstileWidget";
import { safeRedirect } from "@/lib/request";

export const metadata: Metadata = { title: "Sign up", robots: { index: false } };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;
  const safe = redirectTo ? safeRedirect(redirectTo, "") : "";

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <SignupForm
          redirectTo={safe || undefined}
          socialSlot={<GoogleButton label="Sign up with Google" redirectTo={safe || undefined} />}
          captchaSlot={<TurnstileWidget />}
        />
      </main>
      <SiteFooter />
    </>
  );
}
