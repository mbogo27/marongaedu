import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type GeneralSettings = {
  siteName: string;
  tagline: string;
  contactEmail: string;
  phone: string;
  whatsapp: string;
  address: string;
  logoUrl: string;
  faviconUrl: string;
  social: { facebook: string; instagram: string; linkedin: string; youtube: string };
};

export type BrandingSettings = { primaryColor: string; secondaryColor: string; font: string };

export type PaymentSettings = {
  mpesaShortcode: string;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  stripePublishable: string;
  stripeSecret: string;
  usdKesRate: number;
};

export const EMAIL_TEMPLATE_KEYS = [
  "verifyEmail",
  "signupExisting",
  "welcome",
  "passwordReset",
  "passwordChanged",
  "emailChangeConfirm",
  "emailChangeNotice",
  "adminInvite",
  "enrollmentConfirmation",
  "paymentFailed",
  "refundProcessed",
  "certificateIssued",
  "contactMessage",
  "adminNewEnrollment",
  "adminNewReview",
  "newsletterOptin",
] as const;
export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

/** Admin overrides only — absent keys fall back to the coded template. */
export type EmailTemplateOverrides = Partial<Record<EmailTemplateKey, { subject: string; body: string }>>;

export type LegalSettings = { terms: string; privacy: string; refundPolicy: string };

export type CertificateTemplateSettings = {
  primaryColor: string;
  accentColor: string;
  signatureName: string;
  signatureTitle: string;
  /** Storage key (public/) of an optional background image. */
  backgroundKey: string;
  signatureKey: string;
  /** Layout config, all coordinates are fractions of page size (0–1, origin top-left). */
  layout: {
    name: { x: number; y: number; size: number };
    course: { x: number; y: number; size: number };
    date: { x: number; y: number; size: number };
    id: { x: number; y: number; size: number };
    signature: { x: number; y: number; width: number };
    qr: { x: number; y: number; size: number };
  };
};

export type InvoiceSettings = { sellerName: string; sellerAddress: string; sellerTaxId: string; prefix: string };
export type ReviewSettings = { minProgressPercent: number };
export type NotificationSettings = { adminNewEnrollment: boolean; adminNewReview: boolean };
export type NewsletterSettings = { doubleOptIn: boolean };
export type CertificateCodeSettings = { prefix: string };

export type SettingsMap = {
  general: GeneralSettings;
  branding: BrandingSettings;
  payments: PaymentSettings;
  emailTemplates: EmailTemplateOverrides;
  legal: LegalSettings;
  certificateTemplate: CertificateTemplateSettings;
  invoice: InvoiceSettings;
  reviews: ReviewSettings;
  notifications: NotificationSettings;
  newsletter: NewsletterSettings;
  certificateCode: CertificateCodeSettings;
};
export type SettingKey = keyof SettingsMap;

export const DEFAULT_SETTINGS: SettingsMap = {
  general: {
    siteName: "Dental Academy",
    tagline: "Authoritative dental education from a practicing clinician",
    contactEmail: "hello@example.com",
    phone: "+254 700 000 000",
    whatsapp: "254700000000",
    address: "Nairobi, Kenya",
    logoUrl: "",
    faviconUrl: "",
    social: { facebook: "", instagram: "", linkedin: "", youtube: "" },
  },
  branding: { primaryColor: "#0f4c4c", secondaryColor: "#b08b2e", font: "Lora + Inter" },
  payments: {
    mpesaShortcode: "174379",
    mpesaConsumerKey: "",
    mpesaConsumerSecret: "",
    stripePublishable: "",
    stripeSecret: "",
    usdKesRate: 129,
  },
  emailTemplates: {},
  legal: { terms: "", privacy: "", refundPolicy: "" },
  certificateTemplate: {
    primaryColor: "#0f4c4c",
    accentColor: "#b08b2e",
    signatureName: "Lead Instructor",
    signatureTitle: "Instructor",
    backgroundKey: "",
    signatureKey: "",
    layout: {
      name: { x: 0.5, y: 0.45, size: 34 },
      course: { x: 0.5, y: 0.6, size: 22 },
      date: { x: 0.25, y: 0.82, size: 12 },
      id: { x: 0.5, y: 0.93, size: 10 },
      signature: { x: 0.75, y: 0.74, width: 0.16 },
      qr: { x: 0.08, y: 0.74, size: 0.1 },
    },
  },
  invoice: { sellerName: "Dental Academy", sellerAddress: "Nairobi, Kenya", sellerTaxId: "", prefix: "INV" },
  reviews: { minProgressPercent: 0 },
  notifications: { adminNewEnrollment: true, adminNewReview: true },
  newsletter: { doubleOptIn: true },
  certificateCode: { prefix: "DENT" },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepMerge<T>(base: T, over: unknown): T {
  if (!isObject(base) || !isObject(over)) return (over === undefined || over === null ? base : (over as T));
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    out[k] = k in out ? deepMerge(out[k], v) : v;
  }
  return out as T;
}

/** All settings rows in one query, memoised per request. */
const loadAll = cache(async () => {
  const rows = await db.setting.findMany();
  return new Map(rows.map((r) => [r.key, r.value]));
});

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingsMap[K]> {
  const all = await loadAll();
  return deepMerge(DEFAULT_SETTINGS[key], all.get(key));
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingsMap[K]) {
  const json = value as unknown as Prisma.InputJsonValue;
  await db.setting.upsert({ where: { key }, update: { value: json }, create: { key, value: json } });
}

export async function getInstructor() {
  return db.user.findFirst({ where: { role: "ADMIN", deletedAt: null }, orderBy: { createdAt: "asc" } });
}

/** USD display rate: DB setting wins, so editing it in /admin/settings takes effect. */
export async function getUsdRate(): Promise<number> {
  const p = await getSetting("payments");
  return p.usdKesRate > 0 ? p.usdKesRate : 129;
}
