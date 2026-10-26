import { getSetting } from "@/lib/settings";
import { saveCertificateTemplateAction } from "@/lib/actions/admin/settings";
import SettingsForm from "@/components/admin/SettingsForm";
import ImageUrlField from "@/components/admin/ImageUrlField";
import { SettingsCard, SField } from "@/components/admin/settings-ui";

export default async function CertificateSettingsPage() {
  const t = await getSetting("certificateTemplate");
  const L = t.layout;
  const pos = (name: string, label: string, v: { x: number; y: number; size?: number; width?: number }, sizeKey: "size" | "width" | null, sizeLabel = "Size") => (
    <fieldset className="grid gap-3 rounded-xl border border-teal-100 p-4 sm:grid-cols-3">
      <legend className="px-1 text-sm font-medium text-ink/80">{label}</legend>
      <SField label="X (0–1)" name={`${name}X`} type="number" step="0.01" min={0} max={1} defaultValue={v.x} />
      <SField label="Y (0–1)" name={`${name}Y`} type="number" step="0.01" min={0} max={1} defaultValue={v.y} />
      {sizeKey && <SField label={sizeLabel} name={`${name}${sizeKey === "size" ? "Size" : "Width"}`} type="number" step={sizeKey === "size" && name !== "qr" ? 1 : 0.01} min={0} max={sizeKey === "size" && name !== "qr" ? 80 : 1} defaultValue={v[sizeKey]} />}
    </fieldset>
  );

  return (
    <SettingsCard
      title="Certificate template"
      id="certificate"
      description="Upload a background and position each element as a fraction of the page (0,0 = top-left; 1,1 = bottom-right). Existing certificates keep the PDF they were issued with."
    >
      <SettingsForm action={saveCertificateTemplateAction} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SField label="Primary colour" name="primaryColor" type="color" defaultValue={t.primaryColor} />
          <SField label="Accent colour" name="accentColor" type="color" defaultValue={t.accentColor} />
          <SField label="Signatory name" name="signatureName" defaultValue={t.signatureName} required />
          <SField label="Signatory title" name="signatureTitle" defaultValue={t.signatureTitle} />
          <ImageUrlField label="Background image (A4 landscape, PNG/JPG)" name="backgroundKey" target="certificateAsset" valueKind="key" defaultValue={t.backgroundKey} accept="image/png,image/jpeg" />
          <ImageUrlField label="Signature image (transparent PNG)" name="signatureKey" target="certificateAsset" valueKind="key" defaultValue={t.signatureKey} accept="image/png,image/jpeg" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {pos("name", "Learner name", L.name, "size", "Font size")}
          {pos("course", "Course title", L.course, "size", "Font size")}
          {pos("date", "Completion date", L.date, "size", "Font size")}
          {pos("id", "Certificate ID", L.id, "size", "Font size")}
          {pos("sig", "Signature", L.signature, "width", "Width (0–1)")}
          {pos("qr", "Verification QR code", L.qr, "size", "Size (0–1)")}
        </div>
        <p className="text-sm">
          <a href="/admin/settings/certificate/preview" target="_blank" className="font-medium text-teal-800 underline underline-offset-2">
            Preview with sample data (PDF, opens in a new tab)
          </a>{" "}
          — save first to see your latest changes.
        </p>
      </SettingsForm>
    </SettingsCard>
  );
}
