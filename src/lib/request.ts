import "server-only";
import { headers } from "next/headers";

export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}

/**
 * Same-origin-only redirect targets (spec §3.4). Accepts a path that starts
 * with a single "/" and rejects absolute URLs, protocol-relative URLs
 * ("//evil.com"), backslash tricks and control characters.
 */
export function safeRedirect(target: unknown, fallback = "/dashboard"): string {
  if (typeof target !== "string" || !target) return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\")) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(target)) return fallback;
  try {
    const u = new URL(target, "http://local.invalid");
    if (u.origin !== "http://local.invalid") return fallback;
  } catch {
    return fallback;
  }
  return target;
}

/** Turn "Mozilla/5.0 (...) Chrome/120 ..." into "Chrome on Windows". */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const browser =
    /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" :
    /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os =
    /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  return `${browser} on ${os}`;
}
