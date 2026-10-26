import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import {
  DeleteAccountForm,
  EmailForm,
  NotificationForm,
  PasswordForm,
  ProfileForm,
  SessionsList,
} from "@/components/account/AccountForms";
import { requireUser } from "@/lib/dal";
import { db } from "@/lib/db";
import { hasPassword as userHasPassword } from "@/lib/auth/users";
import { verifySessionId } from "@/lib/session";
import { describeUserAgent } from "@/lib/request";
import { parsePrefs } from "@/lib/email/send";
import { formatDate, formatKes } from "@/lib/format";

export const metadata: Metadata = { title: "Account", robots: { index: false } };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ emailChanged?: string }>;
}) {
  const { emailChanged } = await searchParams;
  const user = await requireUser("/account");
  const [hasPw, currentSessionId, sessions, payments] = await Promise.all([
    userHasPassword(user.id),
    verifySessionId(),
    db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { lastActiveAt: "desc" } }),
    db.payment.findMany({ where: { userId: user.id }, include: { course: { select: { title: true } } }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <SiteHeader />
      {!user.emailVerifiedAt && <EmailVerifyBanner />}
      <main id="main" className="flex-1 bg-teal-50/20">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
          <div className="flex items-baseline justify-between">
            <h1 className="font-serif text-3xl text-teal-900">Account</h1>
            <Link href="/dashboard" className="text-sm text-teal-800 underline-offset-2 hover:underline">
              Back to dashboard
            </Link>
          </div>
          {emailChanged === "1" && (
            <p role="status" className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
              Your email address was updated.
            </p>
          )}

          <ProfileForm name={user.name} bio={user.bio} />
          <EmailForm email={user.email} verified={!!user.emailVerifiedAt} hasPassword={hasPw} />
          <PasswordForm hasPassword={hasPw} />
          <SessionsList
            sessions={sessions.map((s) => ({
              id: s.id,
              device: describeUserAgent(s.userAgent),
              ip: s.ipAddress,
              lastActive: formatDistanceToNow(s.lastActiveAt, { addSuffix: true }),
              current: s.id === currentSessionId,
            }))}
          />
          <NotificationForm prefs={parsePrefs(user.notificationPrefs)} />

          <section id="purchases" aria-labelledby="purchases-h" className="rounded-2xl border border-teal-100 bg-white p-6">
            <h2 id="purchases-h" className="font-serif text-lg text-teal-900">
              Purchase history
            </h2>
            {payments.length === 0 ? (
              <p className="mt-4 text-sm text-ink/70">No purchases yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-teal-100 text-left text-ink/70">
                    <tr>
                      <th scope="col" className="py-2 pr-4 font-medium">Course</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Date</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Amount</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                      <th scope="col" className="py-2 font-medium">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-teal-50">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2 pr-4 text-ink">{p.course.title}</td>
                        <td className="py-2 pr-4 text-ink/80">{formatDate(p.createdAt)}</td>
                        <td className="py-2 pr-4 text-ink/80">{formatKes(p.amountKes)}</td>
                        <td className="py-2 pr-4 text-ink/80">{p.status.toLowerCase()}</td>
                        <td className="py-2">
                          {p.invoiceNumber && (p.status === "SUCCESS" || p.status === "REFUNDED") ? (
                            <a href={`/invoices/${p.id}`} className="text-teal-800 underline-offset-2 hover:underline">
                              {p.invoiceNumber}
                            </a>
                          ) : (
                            <span className="text-ink/50">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <DeleteAccountForm hasPassword={hasPw} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
