"use client";

import { useState } from "react";
import RichTextEditor from "./RichTextEditor";
import SettingsForm from "./SettingsForm";
import { saveLegalSettingsAction } from "@/lib/actions/admin/settings";

export default function LegalEditor({ legal }: { legal: { terms: string; privacy: string; refundPolicy: string } }) {
  const [terms, setTerms] = useState(legal.terms);
  const [privacy, setPrivacy] = useState(legal.privacy);
  const [refund, setRefund] = useState(legal.refundPolicy);
  return (
    <SettingsForm action={saveLegalSettingsAction} className="space-y-6">
      <input type="hidden" name="terms" value={terms} />
      <input type="hidden" name="privacy" value={privacy} />
      <input type="hidden" name="refundPolicy" value={refund} />
      <div>
        <p className="mb-1 text-sm font-medium text-ink/80">Terms of Service</p>
        <RichTextEditor content={terms} onChange={setTerms} label="Terms of Service" />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-ink/80">Privacy Policy</p>
        <RichTextEditor content={privacy} onChange={setPrivacy} label="Privacy Policy" />
      </div>
      <div>
        <p className="mb-1 text-sm font-medium text-ink/80">Refund Policy</p>
        <RichTextEditor content={refund} onChange={setRefund} label="Refund Policy" />
      </div>
    </SettingsForm>
  );
}
