import Script from "next/script";
import { env } from "@/lib/env";

/** Cloudflare Turnstile widget; renders nothing unless TURNSTILE_ENABLED=true (spec §3.7). */
export default function TurnstileWidget() {
  if (!env.TURNSTILE_ENABLED) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={env.TURNSTILE_SITE_KEY} />
    </>
  );
}
