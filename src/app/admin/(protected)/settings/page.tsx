import {
  getSetting,
  type GeneralSettings,
  type BrandingSettings,
  type PaymentSettings,
  type EmailTemplates,
  type LegalSettings,
  type CertificateTemplateSettings,
} from "@/lib/settings";
import {
  saveGeneralSettingsAction,
  saveBrandingSettingsAction,
  savePaymentSettingsAction,
  saveEmailTemplatesAction,
  saveLegalSettingsAction,
  saveCertificateTemplateAction,
} from "@/lib/actions/admin/settings";

export default async function AdminSettingsPage() {
  const [general, branding, payments, emailTemplates, legal, certTemplate] = await Promise.all([
    getSetting<GeneralSettings>("general"),
    getSetting<BrandingSettings>("branding"),
    getSetting<PaymentSettings>("payments"),
    getSetting<EmailTemplates>("emailTemplates"),
    getSetting<LegalSettings>("legal"),
    getSetting<CertificateTemplateSettings>("certificateTemplate"),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="font-serif text-2xl text-teal-900">Settings</h1>

      <SettingsCard title="General">
        <form action={saveGeneralSettingsAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Site name" name="siteName" defaultValue={general.siteName} />
          <Field label="Tagline" name="tagline" defaultValue={general.tagline} />
          <Field label="Contact email" name="contactEmail" defaultValue={general.contactEmail} />
          <Field label="Phone" name="phone" defaultValue={general.phone} />
          <Field label="Address" name="address" defaultValue={general.address} className="sm:col-span-2" />
          <Field label="Facebook URL" name="facebook" defaultValue={general.social.facebook} />
          <Field label="Instagram URL" name="instagram" defaultValue={general.social.instagram} />
          <Field label="LinkedIn URL" name="linkedin" defaultValue={general.social.linkedin} />
          <Field label="YouTube URL" name="youtube" defaultValue={general.social.youtube} />
          <SaveButton />
        </form>
      </SettingsCard>

      <SettingsCard title="Branding">
        <form action={saveBrandingSettingsAction} className="grid gap-4 sm:grid-cols-3">
          <Field label="Primary color" name="primaryColor" type="color" defaultValue={branding.primaryColor} />
          <Field label="Secondary color" name="secondaryColor" type="color" defaultValue={branding.secondaryColor} />
          <Field label="Font pairing" name="font" defaultValue={branding.font} />
          <SaveButton />
        </form>
      </SettingsCard>

      <SettingsCard title="Payments (stub configuration)">
        <form action={savePaymentSettingsAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="M-Pesa shortcode" name="mpesaShortcode" defaultValue={payments.mpesaShortcode} />
          <Field label="USD/KES rate" name="usdKesRate" type="number" defaultValue={payments.usdKesRate} />
          <Field label="M-Pesa consumer key" name="mpesaConsumerKey" defaultValue={payments.mpesaConsumerKey} />
          <Field label="M-Pesa consumer secret" name="mpesaConsumerSecret" defaultValue={payments.mpesaConsumerSecret} />
          <Field label="Stripe publishable key" name="stripePublishable" defaultValue={payments.stripePublishable} />
          <Field label="Stripe secret key" name="stripeSecret" defaultValue={payments.stripeSecret} />
          <p className="text-xs text-ink/40 sm:col-span-2">These are stub fields for the demo — saving doesn&apos;t connect to a real gateway.</p>
          <SaveButton />
        </form>
      </SettingsCard>

      <SettingsCard title="Certificate template">
        <form action={saveCertificateTemplateAction} className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary color" name="primaryColor" type="color" defaultValue={certTemplate.primaryColor} />
          <Field label="Accent color" name="accentColor" type="color" defaultValue={certTemplate.accentColor} />
          <Field label="Signature name" name="signatureName" defaultValue={certTemplate.signatureName} />
          <Field label="Signature title" name="signatureTitle" defaultValue={certTemplate.signatureTitle} />
          <SaveButton />
        </form>
      </SettingsCard>

      <SettingsCard title="Email templates">
        <form action={saveEmailTemplatesAction} className="space-y-6">
          <EmailTemplateFields prefix="ec" label="Enrollment confirmation" template={emailTemplates.enrollmentConfirmation} />
          <EmailTemplateFields prefix="w" label="Welcome" template={emailTemplates.welcome} />
          <EmailTemplateFields prefix="pr" label="Password reset" template={emailTemplates.passwordReset} />
          <EmailTemplateFields prefix="ci" label="Certificate issued" template={emailTemplates.certificateIssued} />
          <p className="text-xs text-ink/40">Merge tags available: {"{{name}}"}, {"{{course}}"}.</p>
          <SaveButton />
        </form>
      </SettingsCard>

      <SettingsCard title="Legal pages">
        <form action={saveLegalSettingsAction} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink/70">Terms of Service (HTML)</label>
            <textarea name="terms" defaultValue={legal.terms} rows={4} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Privacy Policy (HTML)</label>
            <textarea name="privacy" defaultValue={legal.privacy} rows={4} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-ink/70">Refund Policy (HTML)</label>
            <textarea name="refundPolicy" defaultValue={legal.refundPolicy} rows={4} className="mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none" />
          </div>
          <SaveButton />
        </form>
      </SettingsCard>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-teal-100 bg-white p-6">
      <h2 className="font-serif text-lg text-teal-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-sm font-medium text-ink/70">{label}</label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className={`mt-1 w-full rounded-lg border border-teal-100 px-4 py-2.5 text-sm focus:border-teal-400 focus:outline-none ${type === "color" ? "h-11" : ""}`}
      />
    </div>
  );
}

function SaveButton() {
  return (
    <div className="sm:col-span-2">
      <button type="submit" className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700">
        Save
      </button>
    </div>
  );
}

function EmailTemplateFields({ prefix, label, template }: { prefix: string; label: string; template: { subject: string; body: string } }) {
  return (
    <div className="rounded-xl border border-teal-50 bg-teal-50/30 p-4">
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="mt-2 space-y-2">
        <input name={`${prefix}_subject`} defaultValue={template.subject} placeholder="Subject" className="w-full rounded-lg border border-teal-100 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
        <textarea name={`${prefix}_body`} defaultValue={template.body} rows={2} placeholder="Body" className="w-full rounded-lg border border-teal-100 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none" />
      </div>
    </div>
  );
}
