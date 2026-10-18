import { sql } from "drizzle-orm"
import type { DbContext } from "@/db"
import { auditLog } from "@/db/schema"
import { projectionRows, requireActor } from "@/db/queries/projections"

export async function createAuditLog(
  ctx: DbContext,
  entry: {
    action: string
    targetType: string
    targetId?: string | null
    communityId?: string | null
    details?: Record<string, unknown>
  }
) {
  await ctx.tx.insert(auditLog).values({ ...entry, actorId: requireActor(ctx) })
}

export async function listAuditLog(ctx: DbContext, limit = 100) {
  return projectionRows<{
    id: string
    action: string
    targetType: string
    targetId: string | null
    details: Record<string, unknown> | null
    createdAt: Date
    actorName: string | null
    actorEmail: string | null
  }>(ctx, sql`select data from vboard_api.audit_entries(${limit}) data`)
}
