import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { consumeToken } from "@/lib/auth/verification";

export const metadata: Metadata = { title: "Confirm email change", robots: { index: false } };

export default async function ConfirmEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const consumed = await consumeToken(token, "CHANGE_EMAIL");

  let ok = false;
  if (consumed.ok && consumed.token.userId) {
    const newEmail = String((consumed.token.meta as { newEmail?: string } | null)?.newEmail ?? consumed.token.identifier);
    const taken = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
    if (!taken) {
      await db.user.update({ where: { id: consumed.token.userId }, data: { email: newEmail, emailVerifiedAt: new Date() } });
      await audit({ actorId: consumed.token.userId, action: "auth.email_changed", targetType: "user", targetId: consumed.token.userId });
      ok = true;
    }
  }
  if (ok) redirect("/account?emailChanged=1");

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="max-w-md">
          <h1 className="font-serif text-2xl text-teal-900">This link can&apos;t be used</h1>
          <p className="mt-2 text-ink/80">It may have expired, been used already, or the address is no longer available.</p>
          <Link href="/account" className="mt-6 inline-block rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
            Back to account
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
