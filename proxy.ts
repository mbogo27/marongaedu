import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "maronga_session";

const ADMIN_PREFIX = "/admin";
const ADMIN_PUBLIC = new Set(["/admin/login"]);
const LEARNER_PROTECTED_PREFIXES = ["/dashboard", "/learn", "/checkout", "/certificates"];
const AUTH_PAGES = new Set(["/login", "/signup"]);

async function readRole(req: NextRequest): Promise<"LEARNER" | "ADMIN" | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return (payload.role as "LEARNER" | "ADMIN") ?? null;
  } catch {
    return null;
  }
}

// Optimistic redirects only — real authorization happens in src/lib/dal.ts
// against the database, per Next.js's documented auth guidance.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const role = await readRole(req);

  if (pathname.startsWith(ADMIN_PREFIX) && !ADMIN_PUBLIC.has(pathname)) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if (LEARNER_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!role) {
      const redirectUrl = new URL("/login", req.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (AUTH_PAGES.has(pathname) && role) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|videos|captions|uploads).*)"],
};
