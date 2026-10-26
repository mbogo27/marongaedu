"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/dal";
import { EMAIL_TEMPLATE_KEYS, getSetting, setSetting, type CertificateTemplateSettings, type EmailTemplateOverrides } from "@/lib/settings";
import { TEMPLATES } from "@/lib/email/templates";
import { sanitizeRichText } from "@/lib/sanitize";

export type SettingsState = { ok?: boolean; error?: string } | undefined;

const str = (max = 300) => z.string().trim().max(max).default("");
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a #rrggbb colour.");
const url = z.string().trim().max(1000).refine((v) => !v || /^(https?:\/\/|\/)/.test(v), "Must be a URL or path.").default("");

async function done(key: string, path = "/admin/settings"): Promise<SettingsState> {
  const admin = await requireAdmin();
  await audit({ actorId: admin.id, action: "settings.update", targetType: "setting", targetId: key });
  revalidatePath(path);
  revalidatePath("/", "layout");
  return { ok: true };
}

function fail(e: z.ZodError): SettingsState {
  return { error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
}

const generalSchema = z.object({
  siteName: z.string().trim().min(1).max(100),
  tagline: str(200),
  contactEmail: z.string().trim().email().or(z.literal("")).default(""),
  phone: str(40),
  whatsapp: z.string().trim().regex(/^\d{0,15}$/, "WhatsApp number: digits only, with country code.").default(""),
  address: str(300),
  logoUrl: url,
  faviconUrl: url,
  facebook: url,
  instagram: url,
  linkedin: url,
  youtube: url,
});

export async function saveGeneralSettingsAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = generalSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error);
  const { facebook, instagram, linkedin, youtube, ...rest } = parsed.data;
  await setSetting("general", { ...rest, social: { facebook, instagram, linkedin, youtube } });
  return done("general");
}

export async function saveBrandingSettingsAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = z.object({ primaryColor: color, secondaryColor: color, font: str(80) }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error);
  await setSetting("branding", parsed.data);
  return done("branding");
}

export async function savePaymentSettingsAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = z
    .object({
      mpesaShortcode: str(20),
      mpesaConsumerKey: str(200),
      mpesaConsumerSecret: str(200),
      stripePublishable: str(200),
      stripeSecret: str(200),
      usdKesRate: z.coerce.number().positive().max(10_000),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error);
  await setSetting("payments", parsed.data);
  return done("payments");
}

export async function saveInvoiceSettingsAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = z
    .object({ sellerName: z.string().trim().min(1).max(150), sellerAddress: str(300), sellerTaxId: str(60), prefix: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9]+$/) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error);
  await setSetting("invoice", { ...parsed.data, prefix: parsed.data.prefix.toUpperCase() });
  return done("invoice");
}

export async function saveRulesSettingsAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = z
    .object({ minProgressPercent: z.coerce.number().int().min(0).max(100), certificatePrefix: z.string().trim().min(2).max(8).regex(/^[A-Za-z]+$/) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error);
  await Promise.all([
    setSetting("reviews", { minProgressPercent: parsed.data.minProgressPercent }),
    setSetting("notifications", { adminNewEnrollment: fd.get("adminNewEnrollment") === "on", adminNewReview: fd.get("adminNewReview") === "on" }),
    setSetting("newsletter", { doubleOptIn: fd.get("doubleOptIn") === "on" }),
    setSetting("certificateCode", { prefix: parsed.data.certificatePrefix.toUpperCase() }),
  ]);
  return done("rules");
}

/** Only templates that differ from the coded default are stored as overrides. */
export async function saveEmailTemplatesAction(overrides: EmailTemplateOverrides): Promise<SettingsState> {
  await requireAdmin();
  const clean: EmailTemplateOverrides = {};
  for (const key of EMAIL_TEMPLATE_KEYS) {
    const o = overrides[key];
    if (!o) continue;
    const subject = o.subject.trim().slice(0, 200);
    const body = o.body.trim().slice(0, 5000);
    if (!subject || !body) continue;
    if (subject === TEMPLATES[key].subject && body === TEMPLATES[key].body) continue;
    clean[key] = { subject, body };
  }
  await setSetting("emailTemplates", clean);
  return done("emailTemplates", "/admin/settings/emails");
}

export async function saveLegalSettingsAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  await setSetting("legal", {
    terms: sanitizeRichText(String(fd.get("terms") ?? "")),
    privacy: sanitizeRichText(String(fd.get("privacy") ?? "")),
    refundPolicy: sanitizeRichText(String(fd.get("refundPolicy") ?? "")),
  });
  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/refund-policy");
  return done("legal", "/admin/settings/legal");
}

const frac = z.coerce.number().min(0).max(1);
const size = z.coerce.number().min(6).max(80);

export async function saveCertificateTemplateAction(_p: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = z
    .object({
      primaryColor: color,
      accentColor: color,
      signatureName: z.string().trim().min(1).max(100),
      signatureTitle: str(100),
      backgroundKey: str(300),
      signatureKey: str(300),
      nameX: frac, nameY: frac, nameSize: size,
      courseX: frac, courseY: frac, courseSize: size,
      dateX: frac, dateY: frac, dateSize: size,
      idX: frac, idY: frac, idSize: size,
      sigX: frac, sigY: frac, sigWidth: frac,
      qrX: frac, qrY: frac, qrSize: frac,
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const next: CertificateTemplateSettings = {
    primaryColor: d.primaryColor,
    accentColor: d.accentColor,
    signatureName: d.signatureName,
    signatureTitle: d.signatureTitle,
    backgroundKey: d.backgroundKey,
    signatureKey: d.signatureKey,
    layout: {
      name: { x: d.nameX, y: d.nameY, size: d.nameSize },
      course: { x: d.courseX, y: d.courseY, size: d.courseSize },
      date: { x: d.dateX, y: d.dateY, size: d.dateSize },
      id: { x: d.idX, y: d.idY, size: d.idSize },
      signature: { x: d.sigX, y: d.sigY, width: d.sigWidth },
      qr: { x: d.qrX, y: d.qrY, size: d.qrSize },
    },
  };
  await setSetting("certificateTemplate", next);
  return done("certificateTemplate", "/admin/settings/certificate");
}

export async function currentUsdRate() {
  await requireAdmin();
  return (await getSetting("payments")).usdKesRate;
}
