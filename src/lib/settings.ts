import { db } from "@/lib/db";

export type GeneralSettings = {
  siteName: string;
  tagline: string;
  contactEmail: string;
  phone: string;
  address: string;
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

export type EmailTemplates = Record<
  "enrollmentConfirmation" | "welcome" | "passwordReset" | "certificateIssued",
  { subject: string; body: string }
>;

export type LegalSettings = { terms: string; privacy: string; refundPolicy: string };

export type CertificateTemplateSettings = {
  primaryColor: string;
  accentColor: string;
  signatureName: string;
  signatureTitle: string;
};

const DEFAULTS: Record<string, unknown> = {
  general: {
    siteName: "Maronga Dental Academy",
    tagline: "Authoritative dental education from a practicing clinician",
    contactEmail: "hello@marongadental.ac.ke",
    phone: "+254 700 000 000",
    address: "Nairobi, Kenya",
    social: { facebook: "", instagram: "", linkedin: "", youtube: "" },
  },
  branding: { primaryColor: "#0f4c4c", secondaryColor: "#b08b2e", font: "Lora + Inter" },
  payments: {
    mpesaShortcode: "174379",
    mpesaConsumerKey: "stub-consumer-key",
    mpesaConsumerSecret: "stub-consumer-secret",
    stripePublishable: "pk_stub_000000",
    stripeSecret: "sk_stub_000000",
    usdKesRate: 129,
  },
  emailTemplates: {},
  legal: { terms: "", privacy: "", refundPolicy: "" },
  certificateTemplate: {
    primaryColor: "#0f4c4c",
    accentColor: "#b08b2e",
    signatureName: "Dr. Godfrey Maronga",
    signatureTitle: "Founder, Maronga Dental Academy",
  },
};

export async function getSetting<T>(key: string): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return DEFAULTS[key] as T;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return DEFAULTS[key] as T;
  }
}

export async function setSetting(key: string, value: unknown) {
  await db.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  });
}

export async function getInstructor() {
  return db.user.findFirst({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
}
