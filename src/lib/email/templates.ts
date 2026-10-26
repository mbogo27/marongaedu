import type { EmailTemplateKey } from "@/lib/settings";

export type MergeVars = Record<string, string | number | undefined | null>;

export type CodedTemplate = {
  subject: string;
  /** Plain text with {{merge}} tags; blank lines separate paragraphs. */
  body: string;
  /** Button label — rendered when a `link` var is supplied. */
  cta?: string;
  /** Which learner preference gates this email; "always" = security/account, never gated. */
  category: "always" | "courseUpdates" | "certificates" | "admin";
  /** Merge tags admins may use, shown in the settings editor. */
  tags: string[];
};

/**
 * Coded default templates (spec §4). Admin overrides in Settings replace the
 * subject/body per key; anything not overridden falls back to these.
 */
export const TEMPLATES: Record<EmailTemplateKey, CodedTemplate> = {
  verifyEmail: {
    subject: "Verify your email for {{site}}",
    body: "Hi {{name}},\n\nWelcome to {{site}}. Please confirm your email address to unlock certificates and course reviews.\n\nThis link expires in 24 hours and can only be used once.",
    cta: "Verify email",
    category: "always",
    tags: ["name", "link", "site"],
  },
  signupExisting: {
    subject: "Someone tried to sign up with your email",
    body: "Hi {{name}},\n\nSomeone tried to create a {{site}} account using this email address, but you already have one.\n\nIf that was you, you can sign in or reset your password. If it wasn't, you can safely ignore this message — nothing has changed on your account.",
    cta: "Sign in",
    category: "always",
    tags: ["name", "link", "site"],
  },
  welcome: {
    subject: "Welcome to {{site}}",
    body: "Hi {{name}},\n\nYour email is verified — welcome aboard! Browse our courses to get started.",
    cta: "Browse courses",
    category: "courseUpdates",
    tags: ["name", "link", "site"],
  },
  passwordReset: {
    subject: "Reset your {{site}} password",
    body: "Hi {{name}},\n\nWe received a request to reset your password. Use the link below to choose a new one. It expires in 1 hour and can only be used once.\n\nIf you didn't ask for this, ignore this email — your password won't change.",
    cta: "Reset password",
    category: "always",
    tags: ["name", "link", "site"],
  },
  passwordChanged: {
    subject: "Your {{site}} password was changed",
    body: "Hi {{name}},\n\nYour password was just changed and you've been signed out of your other devices.\n\nIf this wasn't you, reset your password immediately and contact us.",
    cta: "Reset password",
    category: "always",
    tags: ["name", "link", "site"],
  },
  emailChangeConfirm: {
    subject: "Confirm your new email address",
    body: "Hi {{name}},\n\nConfirm that {{email}} is your new {{site}} email address. Your email won't change until you do. This link expires in 24 hours.",
    cta: "Confirm new email",
    category: "always",
    tags: ["name", "email", "link", "site"],
  },
  emailChangeNotice: {
    subject: "Your {{site}} email address is being changed",
    body: "Hi {{name}},\n\nA request was made to change the email on your account to {{email}}. The change only happens once the new address is confirmed.\n\nIf this wasn't you, reset your password right away.",
    category: "always",
    tags: ["name", "email", "site"],
  },
  adminInvite: {
    subject: "You've been invited to administer {{site}}",
    body: "Hi,\n\n{{inviter}} invited you to join the {{site}} admin team. Use the link below to set your name and password. It expires in 72 hours and can only be used once.",
    cta: "Accept invitation",
    category: "always",
    tags: ["inviter", "link", "site"],
  },
  enrollmentConfirmation: {
    subject: "You're enrolled in {{course}}",
    body: "Hi {{name}},\n\nYou're all set for {{course}}.{{receipt}}\n\nJump back in any time from your dashboard.",
    cta: "Start learning",
    category: "courseUpdates",
    tags: ["name", "course", "link", "amount", "reference", "receipt", "site"],
  },
  paymentFailed: {
    subject: "Your payment for {{course}} didn't go through",
    body: "Hi {{name}},\n\nWe couldn't complete your payment for {{course}}: {{reason}}\n\nNo money has been taken. You can try again whenever you're ready.",
    cta: "Try again",
    category: "courseUpdates",
    tags: ["name", "course", "reason", "link", "site"],
  },
  refundProcessed: {
    subject: "Refund processed for {{course}}",
    body: "Hi {{name}},\n\nWe've refunded your payment of {{amount}} for {{course}} (reference {{reference}}). Your access to the course has been removed; your progress is kept in case you re-enroll.",
    category: "courseUpdates",
    tags: ["name", "course", "amount", "reference", "site"],
  },
  certificateIssued: {
    subject: "Your certificate for {{course}} is ready",
    body: "Congratulations {{name}}!\n\nYou completed {{course}}. Your certificate (ID {{code}}) is ready to view and download.",
    cta: "View certificate",
    category: "certificates",
    tags: ["name", "course", "code", "link", "site"],
  },
  contactMessage: {
    subject: "New contact message: {{subject}}",
    body: "From: {{fromName}} <{{fromEmail}}>\n\n{{message}}",
    category: "admin",
    tags: ["fromName", "fromEmail", "subject", "message"],
  },
  adminNewEnrollment: {
    subject: "New enrollment: {{course}}",
    body: "{{name}} ({{email}}) enrolled in {{course}} — {{amount}}.",
    cta: "View enrollments",
    category: "admin",
    tags: ["name", "email", "course", "amount", "link"],
  },
  adminNewReview: {
    subject: "New {{rating}}★ review on {{course}}",
    body: "{{name}} left a {{rating}}-star review on {{course}}:\n\n{{message}}",
    cta: "Moderate reviews",
    category: "admin",
    tags: ["name", "course", "rating", "message", "link"],
  },
  newsletterOptin: {
    subject: "Confirm your {{site}} newsletter subscription",
    body: "Thanks for subscribing! Please confirm your email address to start receiving updates from {{site}}.",
    cta: "Confirm subscription",
    category: "always",
    tags: ["link", "site"],
  },
};

const MERGE_RE = /\{\{\s*(\w+)\s*\}\}/g;

/** Replace {{tags}}; unknown tags become empty rather than leaking the braces. */
export function mergeTags(input: string, vars: MergeVars): string {
  return input.replace(MERGE_RE, (_m, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export type Brand = { siteName: string; primaryColor: string; accentColor: string; logoUrl?: string; footer?: string };

export type RenderedEmail = { subject: string; html: string; text: string };

/**
 * Render subject/body (already chosen: coded default or admin override) into
 * a branded HTML email plus a plain-text alternative.
 */
export function renderEmail(opts: {
  subject: string;
  body: string;
  cta?: string;
  link?: string;
  vars: MergeVars;
  brand: Brand;
}): RenderedEmail {
  const { brand } = opts;
  const vars = { ...opts.vars, site: brand.siteName, link: opts.link };
  const subject = mergeTags(opts.subject, vars).replace(/\s+/g, " ").trim();
  const bodyText = mergeTags(opts.body, vars).trim();

  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6;color:#1f2937;font-size:15px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  const button =
    opts.cta && opts.link
      ? `<p style="margin:24px 0;"><a href="${escapeHtml(opts.link)}" style="background:${brand.primaryColor};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;">${escapeHtml(opts.cta)}</a></p>` +
        `<p style="margin:0 0 16px;font-size:12px;color:#6b7280;word-break:break-all;">If the button doesn't work, copy this link into your browser:<br>${escapeHtml(opts.link)}</p>`
      : "";

  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.siteName)}" height="36" style="display:block;border:0;">`
    : `<span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(brand.siteName)}</span>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Inter,Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:${brand.primaryColor};padding:20px 28px;border-bottom:4px solid ${brand.accentColor};">${logo}</td></tr>
<tr><td style="padding:28px;">${paragraphs}${button}</td></tr>
<tr><td style="padding:16px 28px 24px;font-size:12px;color:#6b7280;border-top:1px solid #eee;">${escapeHtml(brand.footer ?? `Sent by ${brand.siteName}`)}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [bodyText, opts.cta && opts.link ? `${opts.cta}: ${opts.link}` : "", `— ${brand.siteName}`]
    .filter(Boolean)
    .join("\n\n");

  return { subject, html, text };
}
