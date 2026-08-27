"use client";

import { useState } from "react";

export default function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  function getUrl() {
    return typeof window !== "undefined" ? window.location.href : "";
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm text-ink/60">
      <span>Share:</span>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${title} — ${getUrl()}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-teal-700"
        aria-label="Share on WhatsApp"
      >
        WhatsApp
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getUrl())}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-teal-700"
        aria-label="Share on LinkedIn"
      >
        LinkedIn
      </a>
      <button type="button" onClick={copyLink} className="hover:text-teal-700">
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
