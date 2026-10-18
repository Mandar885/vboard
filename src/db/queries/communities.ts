import { and, asc, eq, sql } from "drizzle-orm"
import type { DbContext } from "@/db"
import { community, communityMember } from "@/db/schema"
import { createAuditLog } from "@/db/queries/audit"
import { isSuperAdmin } from "@/db/queries/profiles"
import {
  projectionRows,
  requireActor,
  requireRow,
} from "@/db/queries/projections"
import { upsertMember } from "@/db/queries/members"

type Summary = {
  id: string
  slug: string
  name: string
  description: string
  logoUrl: string | null
  isActive: boolean
  createdBy: string | null
  createdAt: Date
  postCount: number
  eventCount: number
  teamCount: number
}
export async function listActiveCommunities(ctx: DbContext) {
  return (
    await projectionRows<Summary>(
      ctx,
      sql`select data from vboard_api.community_summaries() data`
    )
  ).filter((row) => row.isActive)
}
export async function listAllCommunities(ctx: DbContext) {
  if (!(await isSuperAdmin(ctx))) throw new Error("Platform access denied")
  return projectionRows<Summary>(
    ctx,
    sql`select data from vboard_api.community_summaries() data`
  )
}
export async function getCommunityBySlug(ctx: DbContext, slug: string) {
  return (
    (
      await ctx.tx.select().from(community).where(eq(community.slug, slug))
    )[0] ?? null
  )
}
export async function getActiveCommunityBySlug(ctx: DbContext, slug: string) {
  return (
    (
      await ctx.tx
        .select()
        .from(community)
        .where(and(eq(community.slug, slug), eq(community.isActive, true)))
    )[0] ?? null
  )
}
export async function getCommunityById(ctx: DbContext, id: string) {
  return (
    (await ctx.tx.select().from(community).where(eq(community.id, id)))[0] ??
    null
  )
}
export async function listMembershipsForUser(ctx: DbContext, userId: string) {
  if (userId !== ctx.actorId && !(await isSuperAdmin(ctx)))
    throw new Error("Membership access denied")
  return ctx.tx
    .select({
      communityId: community.id,
      slug: community.slug,
      name: community.name,
      role: communityMember.role,
    })
    .from(communityMember)
    .innerJoin(community, eq(community.id, communityMember.communityId))
    .where(
      and(
        eq(communityMember.userId, userId),
        eq(communityMember.isActive, true),
        eq(community.isActive, true)
      )
    )
    .orderBy(asc(community.name))
}
export async function createCommunity(
  ctx: DbContext,
  data: { slug: string; name: string; description: string; leadUserId?: string }
) {
  const { leadUserId, ...fields } = data
  const row = requireRow(
    await ctx.tx
      .insert(community)
      .values({ ...fields, createdBy: requireActor(ctx) })
      .returning()
  )
  await createAuditLog(ctx, {
    action: "community.created",
    targetType: "community",
    targetId: row.id,
    communityId: row.id,
  })
  if (leadUserId)
    await upsertMember(ctx, {
      communityId: row.id,
      userId: leadUserId,
      role: "lead",
    })
  return row
}
export async function updateCommunity(
  ctx: DbContext,
  id: string,
  data: { name: string; description: string; logoUrl: string | null }
) {
  requireRow(
    await ctx.tx
      .update(community)
      .set(data)
      .where(eq(community.id, id))
      .returning({ id: community.id })
  )
  await createAuditLog(ctx, {
    action: "community.updated",
    targetType: "community",
    targetId: id,
    communityId: id,
  })
}
export async function setCommunityActive(
  ctx: DbContext,
  id: string,
  isActive: boolean
) {
  requireRow(
    await ctx.tx
      .update(community)
      .set({ isActive })
      .where(eq(community.id, id))
      .returning({ id: community.id })
  )
  await createAuditLog(ctx, {
    action: "community.lifecycle",
    targetType: "community",
    targetId: id,
    communityId: id,
    details: { isActive },
  })
}
