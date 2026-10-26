import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getSetting, type EmailTemplateKey } from "@/lib/settings";
import { getEmailProvider } from "@/lib/email/provider";
import { TEMPLATES, renderEmail, type MergeVars } from "@/lib/email/templates";
import { notify } from "@/lib/notify";

export type NotificationPrefs = { courseUpdates: boolean; certificates: boolean; marketing: boolean };

export const DEFAULT_PREFS: NotificationPrefs = { courseUpdates: true, certificates: true, marketing: true };

export function parsePrefs(raw: unknown): NotificationPrefs {
  const o = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<NotificationPrefs>;
  return {
    courseUpdates: o.courseUpdates ?? true,
    certificates: o.certificates ?? true,
    marketing: o.marketing ?? true,
  };
}

export function absUrl(path: string): string {
  return `${env.APP_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export type SendOptions = {
  /** Path ("/dashboard") or absolute URL; paths are made absolute against APP_URL. */
  link?: string;
  /** Recipient user id — lets us honour notification preferences. */
  userId?: string;
};

/**
 * Send a transactional email. Never throws: failures are written to
 * `EmailLog` and the admin notifications feed so a provider outage can't
 * break signup, checkout or any other request path (spec §4). Call this
 * AFTER the database transaction has committed.
 */
export async function sendEmail(
  key: EmailTemplateKey,
  to: string,
  vars: MergeVars = {},
  options: SendOptions = {}
): Promise<boolean> {
  const coded = TEMPLATES[key];
  try {
    // Preference gate (security/account emails are never gated).
    if (coded.category !== "always" && coded.category !== "admin") {
      const user = options.userId
        ? await db.user.findUnique({ where: { id: options.userId }, select: { notificationPrefs: true, deletedAt: true } })
        : await db.user.findUnique({ where: { email: to }, select: { notificationPrefs: true, deletedAt: true } });
      if (user?.deletedAt) return false;
      const prefs = parsePrefs(user?.notificationPrefs);
      if (!prefs[coded.category]) {
        await db.emailLog.create({ data: { to, template: key, subject: coded.subject, status: "SKIPPED" } });
        return false;
      }
    }

    const [general, branding, overrides] = await Promise.all([
      getSetting("general"),
      getSetting("branding"),
      getSetting("emailTemplates"),
    ]);
    const override = overrides[key];
    const link = options.link ? (options.link.startsWith("http") ? options.link : absUrl(options.link)) : undefined;

    const rendered = renderEmail({
      subject: override?.subject?.trim() || coded.subject,
      body: override?.body?.trim() || coded.body,
      cta: coded.cta,
      link,
      vars,
      brand: {
        siteName: general.siteName,
        primaryColor: branding.primaryColor,
        accentColor: branding.secondaryColor,
        logoUrl: general.logoUrl || undefined,
        footer: `${general.siteName}${general.address ? ` · ${general.address}` : ""}`,
      },
    });

    const provider = getEmailProvider();
    const result = await provider.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: { template: key },
    });

    await db.emailLog.create({
      data: {
        to,
        template: key,
        subject: rendered.subject,
        status: "SENT",
        providerMessageId: result.providerMessageId,
        // Dev/test convenience (verification & reset links); real providers keep no body.
        textBody: provider.id === "console" ? rendered.text : null,
      },
    });
    return true;
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[email] ${key} to ${to} failed:`, error);
    await db.emailLog
      .create({ data: { to, template: key, subject: coded.subject, status: "FAILED", error: error.slice(0, 500) } })
      .catch(() => {});
    await notify("email_failed", { to, template: key, error: error.slice(0, 200) }).catch(() => {});
    return false;
  }
}

/** Email every admin (or ADMIN_NOTIFY_EMAIL when set). */
export async function sendAdminEmail(key: EmailTemplateKey, vars: MergeVars, link?: string) {
  let recipients: string[];
  if (env.ADMIN_NOTIFY_EMAIL) {
    recipients = [env.ADMIN_NOTIFY_EMAIL];
  } else {
    const admins = await db.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE", deletedAt: null },
      select: { email: true },
    });
    recipients = admins.map((a) => a.email);
  }
  await Promise.all(recipients.map((to) => sendEmail(key, to, vars, { link })));
}
