"use client";

import { useState, useTransition } from "react";
import { saveEmailTemplatesAction } from "@/lib/actions/admin/settings";
import { TEMPLATES, renderEmail, type MergeVars } from "@/lib/email/templates";
import type { EmailTemplateKey, EmailTemplateOverrides } from "@/lib/settings";

const LABELS: Record<EmailTemplateKey, string> = {
  verifyEmail: "Verify email",
  signupExisting: "Sign-up attempt on an existing account",
  welcome: "Welcome (after verification)",
  passwordReset: "Password reset link",
  passwordChanged: "Password changed",
  emailChangeConfirm: "Email change: confirm new address",
  emailChangeNotice: "Email change: notice to old address",
  adminInvite: "Admin invitation",
  enrollmentConfirmation: "Enrollment confirmation",
  paymentFailed: "Payment failed",
  refundProcessed: "Refund processed",
  certificateIssued: "Certificate issued",
  contactMessage: "New contact message (to admins)",
  adminNewEnrollment: "New enrollment (to admins)",
  adminNewReview: "New review (to admins)",
  newsletterOptin: "Newsletter confirmation",
};

const SAMPLE: MergeVars = {
  name: "Amina Wanjiru", course: "Endodontic Fundamentals", email: "amina@example.com", amount: "KES 8,500", reference: "MDEMO1A2B3C4D",
  receipt: " Receipt INV-2026-00001: KES 8,500 paid.", reason: "Your card was declined.", code: "DENT-7K3Q-9XPA", inviter: "Dr. Maronga",
  fromName: "Visitor", fromEmail: "visitor@example.com", subject: "Group discount", message: "Do you offer group rates?", rating: 5,
};

export default function EmailTemplatesEditor({
  overrides,
  brand,
}: {
  overrides: EmailTemplateOverrides;
  brand: { siteName: string; primaryColor: string; accentColor: string };
}) {
  const keys = Object.keys(TEMPLATES) as EmailTemplateKey[];
  const [state, setState] = useState<Record<EmailTemplateKey, { subject: string; body: string }>>(() =>
    Object.fromEntries(keys.map((k) => [k, overrides[k] ?? { subject: TEMPLATES[k].subject, body: TEMPLATES[k].body }])) as Record<EmailTemplateKey, { subject: string; body: string }>
  );
  const [open, setOpen] = useState<EmailTemplateKey | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const modified = (k: EmailTemplateKey) => state[k].subject !== TEMPLATES[k].subject || state[k].body !== TEMPLATES[k].body;

  return (
    <div className="space-y-3">
      {keys.map((k) => {
        const t = TEMPLATES[k];
        const preview = open === k ? renderEmail({ subject: state[k].subject, body: state[k].body, cta: t.cta, link: "https://example.com/link", vars: SAMPLE, brand: { siteName: brand.siteName, primaryColor: brand.primaryColor, accentColor: brand.accentColor } }) : null;
        return (
          <div key={k} className="rounded-xl border border-teal-100 bg-white">
            <h3>
              <button type="button" aria-expanded={open === k} onClick={() => setOpen(open === k ? null : k)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-ink">
                <span>
                  {LABELS[k]} {modified(k) && <span className="ml-2 rounded-full bg-gold-100 px-2 py-0.5 text-xs text-gold-900">customised</span>}
                </span>
                <span aria-hidden="true">{open === k ? "−" : "+"}</span>
              </button>
            </h3>
            {open === k && (
              <div className="grid gap-4 border-t border-teal-50 p-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-ink/80">
                    Subject
                    <input value={state[k].subject} onChange={(e) => setState((s) => ({ ...s, [k]: { ...s[k], subject: e.target.value } }))} className="mt-1 w-full rounded-lg border border-teal-200 px-3 py-2 text-sm" />
                  </label>
                  <label className="block text-xs font-medium text-ink/80">
                    Body
                    <textarea value={state[k].body} onChange={(e) => setState((s) => ({ ...s, [k]: { ...s[k], body: e.target.value } }))} rows={8} className="mt-1 w-full rounded-lg border border-teal-200 px-3 py-2 font-mono text-xs" />
                  </label>
                  <p className="text-xs text-ink/70">
                    Merge tags: {t.tags.map((tag) => <code key={tag} className="mr-1 rounded bg-teal-50 px-1">{`{{${tag}}}`}</code>)}
                    Blank lines start a new paragraph.{t.cta && ` A "${t.cta}" button is added automatically.`}
                  </p>
                  <button type="button" onClick={() => setState((s) => ({ ...s, [k]: { subject: t.subject, body: t.body } }))} className="text-xs font-medium text-teal-800 underline underline-offset-2">
                    Reset to default
                  </button>
                </div>
                <div>
                  <p className="text-xs font-medium text-ink/80">Preview (sample data)</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{preview?.subject}</p>
                  <iframe title={`Preview of ${LABELS[k]}`} srcDoc={preview?.html} sandbox="" className="mt-2 h-72 w-full rounded-lg border border-teal-100 bg-white" />
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveEmailTemplatesAction(state);
              setStatus(res?.ok ? "Saved." : (res?.error ?? "Could not save."));
            })
          }
          className="rounded-full bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save templates"}
        </button>
        <span role="status" aria-live="polite" className="text-sm text-teal-800">{status}</span>
      </div>
    </div>
  );
}
