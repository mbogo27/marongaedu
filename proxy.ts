import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { REMEMBER_DAYS, REMEMBER_PREFIX, SESSION_COOKIE } from "@/lib/session-constants";

/**
 * Optimistic redirects + per-request CSP nonce.
 *
 * Auth: the session cookie is an opaque token, so all we can cheaply check
 * here is *presence*. The real session/role/enrollment checks happen in
 * src/lib/dal.ts on every page, action and route handler (spec §0.4). Never
 * rely on this file for security.
 *
 * CSP: nonce-based (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
 * Every page is dynamically rendered (the header reads the session cookie), so
 * nonces work app-wide.
 */
const LEARNER_PROTECTED_PREFIXES = ["/dashboard", "/learn", "/checkout", "/account", "/certificates"];

function origin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  // Storage hosts the browser talks to directly (presigned uploads, signed media, public assets).
  const storage = [origin(process.env.S3_ENDPOINT), origin(process.env.S3_PUBLIC_BASE_URL)].filter(Boolean) as string[];
  const bucketHosts = storage.join(" ");
  const turnstile = process.env.TURNSTILE_ENABLED === "true" ? "https://challenges.cloudflare.com" : "";

  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style="" attributes (progress bars etc.) need 'unsafe-inline' for attributes only; <style> blocks are nonced.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' blob: data: https://picsum.photos ${bucketHosts}`.trim(),
    `media-src 'self' blob: ${bucketHosts}`.trim(),
    `font-src 'self' data:`,
    `connect-src 'self' ${bucketHosts} ${turnstile}${isDev ? " ws: wss:" : ""}`.replace(/\s+/g, " ").trim(),
    `frame-src https://www.youtube-nocookie.com https://player.vimeo.com ${turnstile}`.trim(),
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;

  if (!cookie && LEARNER_PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);

  // Sliding persistence for "Remember me": keep pushing the cookie's expiry out
  // (the DB session slides in dal.ts). Browser-session cookies are left alone.
  if (cookie?.startsWith(REMEMBER_PREFIX)) {
    res.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: REMEMBER_DAYS * 86_400,
    });
  }
  return res;
}

export const config = {
  matcher: [
    {
      // Pages only: skip API routes, media, static assets and prefetches.
      source: "/((?!api|media|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|mp4|vtt|txt|xml)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
