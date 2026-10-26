import { env } from "@/lib/env";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.7 4.2-16.9 10.3z" />
      <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.2-5.1l-6.6-5.4C29.6 35.5 26.9 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.1l-6.6 5.1C9.4 40 16.1 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5h-1.9V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.5l6.6 5.4C41.5 35.6 44 30.2 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

/**
 * Google sign-in entry point (spec §3.10). Renders nothing while
 * AUTH_GOOGLE_ENABLED=false. The OAuth redirect/callback is intentionally not
 * built in this phase — see README "Enabling Google sign-in".
 */
export default function GoogleButton({ label = "Continue with Google", redirectTo }: { label?: string; redirectTo?: string }) {
  if (!env.AUTH_GOOGLE_ENABLED) return null;
  const href = `/api/auth/google${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ""}`;
  return (
    <>
      <a
        href={href}
        className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-teal-200 px-4 py-2.5 text-sm font-medium text-ink/80 transition hover:bg-teal-50"
      >
        <GoogleIcon />
        {label}
      </a>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-ink/60" aria-hidden="true">
        <span className="h-px flex-1 bg-teal-100" />
        or
        <span className="h-px flex-1 bg-teal-100" />
      </div>
    </>
  );
}
