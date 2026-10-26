import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AcceptInviteForm from "@/components/AcceptInviteForm";
import { inspectToken } from "@/lib/auth/verification";

export const metadata: Metadata = { title: "Accept invitation", robots: { index: false } };

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { state, token: row } = await inspectToken(token, "ADMIN_INVITE");

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        {state === "valid" && token && row ? (
          <AcceptInviteForm token={token} email={row.identifier} />
        ) : (
          <div className="max-w-md rounded-2xl border border-teal-100 bg-white p-8 text-center shadow-sm">
            <h1 className="font-serif text-2xl text-teal-900">This invitation can&apos;t be used</h1>
            <p className="mt-3 text-ink/80">It may have expired (invitations last 72 hours), already been used, or been cancelled. Ask an admin to send a new one.</p>
            <Link href="/login" className="mt-6 inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
              Go to log in
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
