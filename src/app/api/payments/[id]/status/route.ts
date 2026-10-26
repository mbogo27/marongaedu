import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { pollPayment } from "@/lib/payments/service";

/** Client polls this every ~2s while an M-Pesa STK push is outstanding (spec §7.2.3). Owner only. */
export async function GET(_req: Request, ctx: RouteContext<"/api/payments/[id]/status">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await pollPayment(user.id, id);
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
