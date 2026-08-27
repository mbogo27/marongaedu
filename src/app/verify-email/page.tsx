import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { verifyEmailAction } from "@/lib/actions/auth";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailAction(token) : false;

  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-6 py-16 text-center">
        <div className="max-w-md">
          {ok ? (
            <>
              <h1 className="font-serif text-2xl text-teal-900">Email verified</h1>
              <p className="mt-2 text-ink/70">Your email is confirmed. You can now download certificates you earn.</p>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-teal-900">Verification link invalid</h1>
              <p className="mt-2 text-ink/70">This link may have expired or already been used.</p>
            </>
          )}
          <Link href="/dashboard" className="mt-6 inline-block rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white">
            Go to dashboard
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
