"use client";

import { useState } from "react";
import Image from "next/image";
import FileUploadField from "./FileUploadField";
import type { UploadTarget } from "@/lib/storage";

/**
 * Upload-or-paste image field for plain <form> posts: holds the value in a
 * hidden input named `name`. `valueKind` decides whether the stored value is
 * the public URL (default) or the storage key (certificate assets, which are
 * read back server-side by key).
 */
export default function ImageUrlField({
  label,
  name,
  target,
  defaultValue = "",
  valueKind = "url",
  accept = "image/jpeg,image/png,image/webp",
}: {
  label: string;
  name: string;
  target: UploadTarget;
  defaultValue?: string;
  valueKind?: "url" | "key";
  accept?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const previewable = value && (value.startsWith("/") || value.startsWith("http"));
  return (
    <div>
      <input type="hidden" name={name} value={value} />
      <FileUploadField
        target={target}
        accept={accept}
        label={label}
        buttonText={value ? "Replace image" : "Upload image"}
        current={value ? value.split("/").pop() : undefined}
        onUploaded={(f) => setValue(valueKind === "key" ? f.key : f.url)}
      />
      {previewable && (
        <div className="relative mt-2 h-16 w-28 overflow-hidden rounded-lg border border-teal-100 bg-teal-50">
          <Image src={value} alt="" fill sizes="112px" className="object-contain" unoptimized />
        </div>
      )}
      {value && (
        <button type="button" onClick={() => setValue("")} className="mt-1 text-xs text-red-700 hover:underline">
          Remove
        </button>
      )}
    </div>
  );
}
