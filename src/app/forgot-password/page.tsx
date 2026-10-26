import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import TurnstileWidget from "@/components/TurnstileWidget";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <ForgotPasswordForm captchaSlot={<TurnstileWidget />} />
      </main>
      <SiteFooter />
    </>
  );
}
