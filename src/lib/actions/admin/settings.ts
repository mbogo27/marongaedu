"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { setSetting } from "@/lib/settings";
import { saveUpload } from "@/lib/storage";

export async function saveGeneralSettingsAction(formData: FormData) {
  await requireAdmin();
  await setSetting("general", {
    siteName: String(formData.get("siteName") || ""),
    tagline: String(formData.get("tagline") || ""),
    contactEmail: String(formData.get("contactEmail") || ""),
    phone: String(formData.get("phone") || ""),
    address: String(formData.get("address") || ""),
    social: {
      facebook: String(formData.get("facebook") || ""),
      instagram: String(formData.get("instagram") || ""),
      linkedin: String(formData.get("linkedin") || ""),
      youtube: String(formData.get("youtube") || ""),
    },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/");
}

export async function saveBrandingSettingsAction(formData: FormData) {
  await requireAdmin();
  await setSetting("branding", {
    primaryColor: String(formData.get("primaryColor") || "#0f4c4c"),
    secondaryColor: String(formData.get("secondaryColor") || "#b08b2e"),
    font: String(formData.get("font") || "Lora + Inter"),
  });
  revalidatePath("/admin/settings");
}

export async function savePaymentSettingsAction(formData: FormData) {
  await requireAdmin();
  await setSetting("payments", {
    mpesaShortcode: String(formData.get("mpesaShortcode") || ""),
    mpesaConsumerKey: String(formData.get("mpesaConsumerKey") || ""),
    mpesaConsumerSecret: String(formData.get("mpesaConsumerSecret") || ""),
    stripePublishable: String(formData.get("stripePublishable") || ""),
    stripeSecret: String(formData.get("stripeSecret") || ""),
    usdKesRate: Number(formData.get("usdKesRate") || 129),
  });
  revalidatePath("/admin/settings");
}

export async function saveEmailTemplatesAction(formData: FormData) {
  await requireAdmin();
  await setSetting("emailTemplates", {
    enrollmentConfirmation: { subject: String(formData.get("ec_subject") || ""), body: String(formData.get("ec_body") || "") },
    welcome: { subject: String(formData.get("w_subject") || ""), body: String(formData.get("w_body") || "") },
    passwordReset: { subject: String(formData.get("pr_subject") || ""), body: String(formData.get("pr_body") || "") },
    certificateIssued: { subject: String(formData.get("ci_subject") || ""), body: String(formData.get("ci_body") || "") },
  });
  revalidatePath("/admin/settings");
}

export async function saveLegalSettingsAction(formData: FormData) {
  await requireAdmin();
  await setSetting("legal", {
    terms: String(formData.get("terms") || ""),
    privacy: String(formData.get("privacy") || ""),
    refundPolicy: String(formData.get("refundPolicy") || ""),
  });
  revalidatePath("/admin/settings");
  revalidatePath("/terms");
  revalidatePath("/privacy");
  revalidatePath("/refund-policy");
}

export async function saveCertificateTemplateAction(formData: FormData) {
  await requireAdmin();
  const backgroundFile = formData.get("backgroundImage") as File | null;
  if (backgroundFile && backgroundFile.size > 0) {
    await saveUpload(backgroundFile, "certificates");
  }
  await setSetting("certificateTemplate", {
    primaryColor: String(formData.get("primaryColor") || "#0f4c4c"),
    accentColor: String(formData.get("accentColor") || "#b08b2e"),
    signatureName: String(formData.get("signatureName") || ""),
    signatureTitle: String(formData.get("signatureTitle") || ""),
  });
  revalidatePath("/admin/settings");
}
