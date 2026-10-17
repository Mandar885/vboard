import { and, asc, eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { community, communityMember, post } from "@/db/schema"

const postCount = sql<number>`(
  select count(*)::int from ${post}
  where ${post.communityId} = "community"."id" and ${post.status} = 'published'
)`
const eventCount = sql<number>`(
  select count(*)::int from ${post}
  where ${post.communityId} = "community"."id" and ${post.status} = 'published'
  and ${post.isEvent} = true
)`
const teamCount = sql<number>`(
  select count(*)::int from ${communityMember}
  where ${communityMember.communityId} = "community"."id"
  and ${communityMember.isActive} = true
)`

export async function listActiveCommunities() {
  return db
    .select({
      id: community.id,
      slug: community.slug,
      name: community.name,
      description: community.description,
      logoUrl: community.logoUrl,
      postCount,
      eventCount,
      teamCount,
    })
    .from(community)
    .where(eq(community.isActive, true))
    .orderBy(asc(community.name))
}

export async function listAllCommunities() {
  return db
    .select({
      id: community.id,
      slug: community.slug,
      name: community.name,
      isActive: community.isActive,
      department: community.department,
      approvalStatus: community.approvalStatus,
      createdBy: community.createdBy,
      createdAt: community.createdAt,
      postCount,
      teamCount,
    })
    .from(community)
    .orderBy(asc(community.name))
}

export async function getCommunityBySlug(slug: string) {
  const row = await db.query.community.findFirst({
    where: eq(community.slug, slug),
  })
  return row ?? null
}

export async function getActiveCommunityBySlug(slug: string) {
  const row = await db.query.community.findFirst({
    where: and(eq(community.slug, slug), eq(community.isActive, true)),
  })
  return row ?? null
}

export async function getCommunityById(id: string) {
  const row = await db.query.community.findFirst({
    where: eq(community.id, id),
  })
  return row ?? null
}

export async function createCommunity(data: {
  slug: string
  name: string
  description: string
  createdBy: string
  department?: string | null
  approvalStatus?: "pending" | "approved"
  isActive?: boolean
}) {
  const [row] = await db.insert(community).values(data).returning()
  return row
}

export async function approveCommunity(id: string) {
  await db
    .update(community)
    .set({
      approvalStatus: "approved",
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(community.id, id))
}

export async function updateCommunity(
  id: string,
  data: { name: string; description: string; logoUrl: string | null }
) {
  await db
    .update(community)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(community.id, id))
}

export async function setCommunityActive(id: string, isActive: boolean) {
  await db
    .update(community)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(community.id, id))
}

export async function listMembershipsForUser(userId: string) {
  return db
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
