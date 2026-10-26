import "server-only";
import { env } from "@/lib/env";

/**
 * Optional Cloudflare Turnstile (spec §3.7). Disabled unless
 * TURNSTILE_ENABLED=true; when disabled this always passes.
 */
export async function verifyTurnstile(token: FormDataEntryValue | null, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_ENABLED) return true;
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY ?? "", response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
