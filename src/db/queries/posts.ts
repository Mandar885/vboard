import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm"
import { db } from "@/db"
import { community, post, registration, user } from "@/db/schema"

const seatsTaken = sql<number>`(
  select count(*)::int from ${registration}
  where ${registration.postId} = "post"."id"
  and ${registration.status} in ('approved', 'attended')
)`
const pendingCount = sql<number>`(
  select count(*)::int from ${registration}
  where ${registration.postId} = "post"."id" and ${registration.status} = 'pending'
)`

const feedColumns = {
  id: post.id,
  slug: post.slug,
  title: post.title,
  body: post.body,
  visibility: post.visibility,
  isPinned: post.isPinned,
  status: post.status,
  isEvent: post.isEvent,
  startsAt: post.startsAt,
  endsAt: post.endsAt,
  location: post.location,
  locationVisibility: post.locationVisibility,
  registrationOpensAt: post.registrationOpensAt,
  registrationClosesAt: post.registrationClosesAt,
  capacity: post.capacity,
  requiresApproval: post.requiresApproval,
  createdAt: post.createdAt,
  communityId: community.id,
  communitySlug: community.slug,
  communityName: community.name,
  authorName: user.name,
  seatsTaken,
}

export type FeedPost = Awaited<ReturnType<typeof listFeed>>[number]

function visibleTo(signedIn: boolean) {
  return and(
    eq(post.status, "published"),
    eq(community.isActive, true),
    signedIn ? undefined : eq(post.visibility, "public")
  )
}

export async function listFeed(opts: {
  signedIn: boolean
  communityId?: string
}) {
  return db
    .select(feedColumns)
    .from(post)
    .innerJoin(community, eq(community.id, post.communityId))
    .leftJoin(user, eq(user.id, post.authorId))
    .where(
      and(
        visibleTo(opts.signedIn),
        opts.communityId ? eq(post.communityId, opts.communityId) : undefined
      )
    )
    .orderBy(desc(post.isPinned), desc(post.createdAt))
    .limit(100)
}

export async function listEvents(opts: { signedIn: boolean }) {
  return db
    .select(feedColumns)
    .from(post)
    .innerJoin(community, eq(community.id, post.communityId))
    .leftJoin(user, eq(user.id, post.authorId))
    .where(and(visibleTo(opts.signedIn), eq(post.isEvent, true)))
    .orderBy(asc(post.startsAt))
}

export async function getPostDetailBySlug(slug: string) {
  const [row] = await db
    .select(feedColumns)
    .from(post)
    .innerJoin(community, eq(community.id, post.communityId))
    .leftJoin(user, eq(user.id, post.authorId))
    .where(and(eq(post.slug, slug), eq(community.isActive, true)))
    .limit(1)
  return row ?? null
}

export async function getPostById(id: string) {
  const row = await db.query.post.findFirst({ where: eq(post.id, id) })
  return row ?? null
}

export async function getSeatsTaken(postId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(registration)
    .where(
      and(
        eq(registration.postId, postId),
        inArray(registration.status, ["approved", "attended"])
      )
    )
  return row?.n ?? 0
}

export async function listCommunityPosts(communityId: string) {
  return db
    .select({
      id: post.id,
      slug: post.slug,
      title: post.title,
      status: post.status,
      isEvent: post.isEvent,
      isPinned: post.isPinned,
      startsAt: post.startsAt,
      capacity: post.capacity,
      createdAt: post.createdAt,
      seatsTaken,
      pendingCount,
    })
    .from(post)
    .where(eq(post.communityId, communityId))
    .orderBy(desc(post.createdAt))
}

export type PostInput = {
  title: string
  body: string
  visibility: "public" | "vit_only"
  isPinned: boolean
  isEvent: boolean
  startsAt: Date | null
  endsAt: Date | null
  location: string | null
  locationVisibility: "public" | "after_approval" | null
  registrationOpensAt: Date | null
  registrationClosesAt: Date | null
  capacity: number | null
  requiresApproval: boolean
}

export async function createPost(
  data: PostInput & {
    slug: string
    communityId: string
    authorId: string
    status: "draft" | "published"
  }
) {
  const [row] = await db.insert(post).values(data).returning({ id: post.id })
  return row
}

export async function updatePost(id: string, data: PostInput) {
  await db
    .update(post)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(post.id, id))
}

export async function setAdvisorApproval(id: string, approvedBy: string) {
  await db
    .update(post)
    .set({
      advisorApprovedBy: approvedBy,
      advisorApprovedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(post.id, id))
}

export async function setPostStatus(
  id: string,
  status: "draft" | "published" | "cancelled" | "completed" | "hidden"
) {
  await db
    .update(post)
    .set({ status, updatedAt: new Date() })
    .where(eq(post.id, id))
}

export async function deletePost(id: string) {
  await db.delete(post).where(eq(post.id, id))
}

const PRIVATE_STATUSES = ["draft", "cancelled", "completed", "hidden"] as const

export type DashboardEventWhen = "all" | "upcoming" | "past"
export type DashboardEventStatus =
  "all" | (typeof PRIVATE_STATUSES)[number] | "published"

export async function listDashboardEvents(opts: {
  seeAll: boolean
  readableCommunityIds: string[]
  q: string
  communitySlug: string | null
  when: DashboardEventWhen
  status: DashboardEventStatus
  now: Date
}) {
  const term = opts.q.trim().replace(/[%_]/g, "")
  const privateScope =
    !opts.seeAll && opts.readableCommunityIds.length > 0
      ? and(
          inArray(post.communityId, opts.readableCommunityIds),
          inArray(post.status, [...PRIVATE_STATUSES])
        )
      : undefined
  const visibility = opts.seeAll
    ? undefined
    : privateScope
      ? or(eq(post.status, "published"), privateScope)
      : eq(post.status, "published")

  return db
    .select({
      id: post.id,
      slug: post.slug,
      title: post.title,
      status: post.status,
      startsAt: post.startsAt,
      endsAt: post.endsAt,
      capacity: post.capacity,
      communityId: community.id,
      communitySlug: community.slug,
      communityName: community.name,
      seatsTaken,
    })
    .from(post)
    .innerJoin(community, eq(community.id, post.communityId))
    .where(
      and(
        eq(post.isEvent, true),
        eq(community.isActive, true),
        visibility,
        opts.when === "upcoming" ? gte(post.endsAt, opts.now) : undefined,
        opts.when === "past" ? lt(post.endsAt, opts.now) : undefined,
        opts.status === "all" ? undefined : eq(post.status, opts.status),
        opts.communitySlug ? eq(community.slug, opts.communitySlug) : undefined,
        term ? ilike(post.title, `%${term}%`) : undefined
      )
    )
    .orderBy(opts.when === "past" ? desc(post.startsAt) : asc(post.startsAt))
    .limit(200)
}

export async function listUpcomingEventsForCommunities(
  communityIds: string[],
  now: Date = new Date()
) {
  if (communityIds.length === 0) return []
  return db
    .select({
      id: post.id,
      title: post.title,
      startsAt: post.startsAt,
      capacity: post.capacity,
      status: post.status,
      communitySlug: community.slug,
      communityName: community.name,
      seatsTaken,
      pendingCount,
    })
    .from(post)
    .innerJoin(community, eq(community.id, post.communityId))
    .where(
      and(
        inArray(post.communityId, communityIds),
        eq(post.isEvent, true),
        inArray(post.status, ["draft", "published"]),
        gte(post.endsAt, now)
      )
    )
    .orderBy(asc(post.startsAt))
    .limit(10)
}

export async function countPublishedPosts() {
  const [row] = await db
    .select({
      posts: sql<number>`count(*)::int`,
      events: sql<number>`count(*) filter (where ${post.isEvent})::int`,
    })
    .from(post)
    .where(eq(post.status, "published"))
  return { posts: row?.posts ?? 0, events: row?.events ?? 0 }
}

export async function countEventsBetween(from: Date, to: Date) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(post)
    .where(
      and(
        eq(post.isEvent, true),
        eq(post.status, "published"),
        gte(post.startsAt, from),
        lte(post.startsAt, to)
      )
    )
  return row?.n ?? 0
}

export async function setPostPinned(id: string, isPinned: boolean) {
  await db
    .update(post)
    .set({ isPinned, updatedAt: new Date() })
    .where(eq(post.id, id))
}
