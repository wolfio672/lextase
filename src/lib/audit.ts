import "server-only";
import { db } from "@/lib/db";

export async function writeAuditLog(params: {
  actorId: string | null;
  targetId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: params.actorId,
      targetId: params.targetId ?? null,
      action: params.action,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: params.ipAddress ?? null,
    },
  });
}
