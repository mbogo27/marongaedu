import { NextResponse } from "next/server";

/**
 * Placeholder for the Google OAuth start/callback (spec §3.10: designed for,
 * not built). The data model (Account table), the linking rule
 * (src/lib/auth/oauth.ts) and the feature flag are in place; the handler
 * below is the one piece to implement. See README "Enabling Google sign-in".
 */
export function GET() {
  return NextResponse.json(
    { error: "Google sign-in is not implemented yet. See README → Enabling Google sign-in." },
    { status: 501 }
  );
}
