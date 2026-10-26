import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { getLessonView } from "@/lib/lesson-access";

/**
 * Guarded JSON access to a lesson body (spec §5.3, AC 6). Used to refresh
 * signed media URLs when they near expiry and exercised directly in E2E tests.
 * Non-enrolled users get 403 (404 for lessons that don't exist/aren't public).
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/lessons/[lessonId]">) {
  const { lessonId } = await ctx.params;
  const viewer = await getCurrentUser();
  const view = await getLessonView(viewer, lessonId);
  if (!view.ok) {
    const status = view.reason === "not_found" ? 404 : view.reason === "locked" ? 423 : viewer ? 403 : 401;
    return NextResponse.json({ error: view.reason }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(view, { headers: { "Cache-Control": "private, no-store" } });
}
