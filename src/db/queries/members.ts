import { and, eq, sql } from "drizzle-orm"
import type { DbContext } from "@/db"
import { communityMember } from "@/db/schema"
import { createAuditLog } from "@/db/queries/audit"
import {
  projectionRows,
  requireActor,
  requireRow,
} from "@/db/queries/projections"

type CommunityRole = typeof communityMember.$inferSelect.role
export async function listMembers(ctx: DbContext, communityId: string) {
  return projectionRows<{
    id: string
    userId: string
    name: string
    email: string
    role: CommunityRole
    isActive: boolean
    joinedAt: Date
    rollNumber: string | null
    department: string | null
  }>(
    ctx,
    sql`select data from vboard_api.community_members(${communityId}::uuid) data`
  )
}
export async function getMember(
  ctx: DbContext,
  communityId: string,
  userId: string
) {
  return (
    (
      await ctx.tx
        .select()
        .from(communityMember)
        .where(
          and(
            eq(communityMember.communityId, communityId),
            eq(communityMember.userId, userId)
          )
        )
    )[0] ?? null
  )
}
export async function getMemberById(ctx: DbContext, id: string) {
  return (
    (
      await ctx.tx
        .select()
        .from(communityMember)
        .where(eq(communityMember.id, id))
    )[0] ?? null
  )
}
export async function upsertMember(
  ctx: DbContext,
  data: { communityId: string; userId: string; role: CommunityRole }
) {
  const addedBy = requireActor(ctx)
  const row = requireRow(
    await ctx.tx
      .insert(communityMember)
      .values({ ...data, addedBy })
      .onConflictDoUpdate({
        target: [communityMember.communityId, communityMember.userId],
        set: { role: data.role, isActive: true, addedBy },
      })
      .returning()
  )
  await createAuditLog(ctx, {
    action: "member.appointed",
    targetType: "member",
    targetId: row.id,
    communityId: data.communityId,
    details: { userId: data.userId, role: data.role },
  })
  return row
}
export async function setMemberRole(
  ctx: DbContext,
  communityId: string,
  id: string,
  role: CommunityRole
) {
  requireRow(
    await ctx.tx
      .update(communityMember)
      .set({ role, addedBy: requireActor(ctx) })
      .where(
        and(
          eq(communityMember.id, id),
          eq(communityMember.communityId, communityId)
        )
      )
      .returning()
  )
  await createAuditLog(ctx, {
    action: "member.role",
    targetType: "member",
    targetId: id,
    communityId,
    details: { role },
  })
}
export async function deactivateMember(
  ctx: DbContext,
  communityId: string,
  id: string
) {
  requireRow(
    await ctx.tx
      .update(communityMember)
      .set({ isActive: false, addedBy: requireActor(ctx) })
      .where(
        and(
          eq(communityMember.id, id),
          eq(communityMember.communityId, communityId)
        )
      )
      .returning()
  )
  await createAuditLog(ctx, {
    action: "member.deactivated",
    targetType: "member",
    targetId: id,
    communityId,
  })
}
