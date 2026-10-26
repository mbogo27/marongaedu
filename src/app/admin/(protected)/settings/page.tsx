import { getSetting } from "@/lib/settings";
import { env } from "@/lib/env";
import {
  saveGeneralSettingsAction,
  saveBrandingSettingsAction,
  savePaymentSettingsAction,
  saveInvoiceSettingsAction,
  saveRulesSettingsAction,
} from "@/lib/actions/admin/settings";
import SettingsForm from "@/components/admin/SettingsForm";
import ImageUrlField from "@/components/admin/ImageUrlField";
import { SettingsCard, SField } from "@/components/admin/settings-ui";

export default async function AdminSettingsPage() {
  const [general, branding, payments, invoice, reviews, notifications, newsletter, certCode] = await Promise.all([
    getSetting("general"),
    getSetting("branding"),
    getSetting("payments"),
    getSetting("invoice"),
    getSetting("reviews"),
    getSetting("notifications"),
    getSetting("newsletter"),
    getSetting("certificateCode"),
  ]);

  const flags: [string, string][] = [
    ["PAYMENTS_MODE", env.PAYMENTS_MODE],
    ["EMAIL_PROVIDER", env.EMAIL_PROVIDER],
    ["STORAGE_PROVIDER", env.STORAGE_PROVIDER],
    ["RATE_LIMIT_PROVIDER", env.RATE_LIMIT_PROVIDER],
    ["AUTH_GOOGLE_ENABLED", String(env.AUTH_GOOGLE_ENABLED)],
    ["TURNSTILE_ENABLED", String(env.TURNSTILE_ENABLED)],
    ["FEATURE_DISCUSSIONS", String(env.FEATURE_DISCUSSIONS)],
    ["ANALYTICS_PROVIDER", env.ANALYTICS_PROVIDER],
  ];

  return (
    <div className="space-y-8">
      <SettingsCard title="General" id="general">
        <SettingsForm action={saveGeneralSettingsAction}>
          <SField label="Site name" name="siteName" defaultValue={general.siteName} required />
          <SField label="Tagline" name="tagline" defaultValue={general.tagline} />
          <SField label="Contact email" name="contactEmail" type="email" defaultValue={general.contactEmail} />
          <SField label="Phone" name="phone" defaultValue={general.phone} />
          <SField label="WhatsApp number" name="whatsapp" defaultValue={general.whatsapp} hint="Digits only with country code, e.g. 254700000000." />
          <SField label="Address" name="address" defaultValue={general.address} />
          <ImageUrlField label="Logo" name="logoUrl" target="siteAsset" defaultValue={general.logoUrl} />
          <ImageUrlField label="Favicon" name="faviconUrl" target="siteAsset" defaultValue={general.faviconUrl} accept="image/png,image/jpeg,image/webp" />
          <SField label="Facebook URL" name="facebook" defaultValue={general.social.facebook} />
          <SField label="Instagram URL" name="instagram" defaultValue={general.social.instagram} />
          <SField label="LinkedIn URL" name="linkedin" defaultValue={general.social.linkedin} />
          <SField label="YouTube URL" name="youtube" defaultValue={general.social.youtube} />
        </SettingsForm>
      </SettingsCard>

      <SettingsCard title="Branding" id="branding" description="Used in emails and certificates.">
        <SettingsForm action={saveBrandingSettingsAction} className="grid gap-4 sm:grid-cols-3">
          <SField label="Primary colour" name="primaryColor" type="color" defaultValue={branding.primaryColor} />
          <SField label="Secondary colour" name="secondaryColor" type="color" defaultValue={branding.secondaryColor} />
          <SField label="Font pairing" name="font" defaultValue={branding.font} />
        </SettingsForm>
      </SettingsCard>

      <SettingsCard title="Payments" id="payments" description={`Mode: ${env.PAYMENTS_MODE}. Provider credentials below are placeholders; real M-Pesa / card rails plug in behind the PaymentProvider interface.`}>
        <SettingsForm action={savePaymentSettingsAction}>
          <SField label="USD / KES display rate" name="usdKesRate" type="number" step="0.01" defaultValue={payments.usdKesRate} hint="Display-only. Charges are always in KES." />
          <SField label="M-Pesa shortcode" name="mpesaShortcode" defaultValue={payments.mpesaShortcode} />
          <SField label="M-Pesa consumer key" name="mpesaConsumerKey" defaultValue={payments.mpesaConsumerKey} autoComplete="off" />
          <SField label="M-Pesa consumer secret" name="mpesaConsumerSecret" defaultValue={payments.mpesaConsumerSecret} autoComplete="off" />
          <SField label="Stripe publishable key" name="stripePublishable" defaultValue={payments.stripePublishable} autoComplete="off" />
          <SField label="Stripe secret key" name="stripeSecret" defaultValue={payments.stripeSecret} autoComplete="off" />
        </SettingsForm>
      </SettingsCard>

      <SettingsCard title="Invoices" id="invoice" description="Seller details printed on invoice PDFs.">
        <SettingsForm action={saveInvoiceSettingsAction}>
          <SField label="Seller name" name="sellerName" defaultValue={invoice.sellerName} required />
          <SField label="Invoice number prefix" name="prefix" defaultValue={invoice.prefix} hint="e.g. INV → INV-2026-00001" required />
          <SField label="Seller address" name="sellerAddress" defaultValue={invoice.sellerAddress} />
          <SField label="Tax ID (optional)" name="sellerTaxId" defaultValue={invoice.sellerTaxId} />
        </SettingsForm>
      </SettingsCard>

      <SettingsCard title="Rules &amp; notifications" id="rules">
        <SettingsForm action={saveRulesSettingsAction}>
          <SField label="Minimum progress before reviewing (%)" name="minProgressPercent" type="number" min={0} max={100} defaultValue={reviews.minProgressPercent} hint="0 = enrolled learners can review immediately." />
          <SField label="Certificate ID prefix" name="certificatePrefix" defaultValue={certCode.prefix} hint="e.g. DENT → DENT-7K3Q-9XPA" />
          <fieldset className="space-y-2 text-sm text-ink/80 sm:col-span-2">
            <legend className="font-medium">Email me (admins) when…</legend>
            <label className="flex items-center gap-2"><input type="checkbox" name="adminNewEnrollment" defaultChecked={notifications.adminNewEnrollment} /> someone enrolls</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="adminNewReview" defaultChecked={notifications.adminNewReview} /> someone leaves a review</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="doubleOptIn" defaultChecked={newsletter.doubleOptIn} /> Newsletter sign-ups must confirm by email (double opt-in)</label>
          </fieldset>
        </SettingsForm>
      </SettingsCard>

      <SettingsCard title="Feature flags &amp; providers" id="flags" description="Read-only. Set these in the environment (.env / hosting dashboard); see the README.">
        <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          {flags.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 border-b border-teal-50 py-1">
              <dt className="font-mono text-xs text-ink/70">{k}</dt>
              <dd className="font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </SettingsCard>
    </div>
  );
}
