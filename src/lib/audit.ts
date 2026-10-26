import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/request";

export type AuditInput = {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Prisma.InputJsonValue;
  ip?: string;
};

/**
 * Append-only audit trail for admin actions and security events (spec §6).
 * Never throws: auditing must not break the action being audited.
 */
export async function audit(input: AuditInput) {
  try {
    let ip = input.ip;
    if (!ip) {
      try {
        ip = await getClientIp();
      } catch {
        ip = undefined; // outside a request (CLI, seed)
      }
    }
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        meta: input.meta,
        ip,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write", input.action, e);
  }
}
