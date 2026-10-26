"use client";

import { useRef, useState } from "react";
import { requestUploadAction } from "@/lib/actions/admin/courses";
import type { UploadTarget } from "@/lib/storage";

export type UploadedFile = { key: string; url: string; filename: string; size: number; contentType: string };

/** Read a video file's duration in seconds from its metadata (client side, no upload needed). */
export function probeVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const d = Number.isFinite(v.duration) ? Math.round(v.duration) : null;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    v.src = url;
  });
}

/**
 * Direct-to-storage upload with a progress bar (spec §6). Asks the server for
 * a presigned PUT (which validates MIME + size), then uploads the file
 * straight from the browser with XHR so we can report progress.
 */
export default function FileUploadField({
  target,
  accept,
  label,
  buttonText = "Upload file",
  onUploaded,
  onFileChosen,
  current,
}: {
  target: UploadTarget;
  accept: string;
  label: string;
  buttonText?: string;
  onUploaded: (file: UploadedFile) => void;
  /** Runs before upload with the raw File (e.g. to read video duration). */
  onFileChosen?: (file: File) => void;
  /** Text shown for the currently attached file. */
  current?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  async function handle(file: File) {
    setError(null);
    setName(file.name);
    onFileChosen?.(file);
    const type = file.type || "application/octet-stream";
    const req = await requestUploadAction(target, file.name, type, file.size);
    if (!req.ok) return setError(req.error);

    setProgress(0);
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open(req.upload.method, req.upload.url);
      for (const [k, v] of Object.entries(req.upload.headers)) xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onUploaded({ key: req.key, url: req.url, filename: file.name, size: file.size, contentType: type });
        } else {
          let msg = `Upload failed (${xhr.status}).`;
          try {
            msg = (JSON.parse(xhr.responseText) as { error?: string }).error ?? msg;
          } catch {
            /* non-JSON body from the bucket */
          }
          setError(msg);
        }
        setProgress(null);
        resolve();
      };
      xhr.onerror = () => {
        setError("Upload failed. Check your connection (and the bucket's CORS settings when using S3).");
        setProgress(null);
        resolve();
      };
      xhr.send(file);
    });
    if (input.current) input.current.value = "";
  }

  const busy = progress !== null;
  return (
    <div>
      <span className="text-sm font-medium text-ink/80">{label}</span>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="rounded-lg border border-dashed border-teal-300 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-60"
        >
          {busy ? "Uploading…" : buttonText}
        </button>
        <input
          ref={input}
          type="file"
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-label={label}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handle(f);
          }}
        />
        {(current || name) && !busy && <span className="max-w-[16rem] truncate text-xs text-ink/70">{name ?? current}</span>}
      </div>
      {busy && (
        <div className="mt-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Uploading ${name}`}>
          <div className="h-2 overflow-hidden rounded-full bg-teal-100">
            <div className="h-full rounded-full bg-teal-700 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink/70">{progress}%</p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
