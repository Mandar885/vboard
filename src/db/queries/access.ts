import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  community,
  communityInvite,
  eventHost,
  permissionOverride,
  post,
  user,
} from "@/db/schema"
import {
  isCommunityCapability,
  type CommunityRole,
  type PermissionOverride,
} from "@/lib/rbac"
import { upsertMember } from "@/db/queries/members"

export async function listPermissionOverrides(): Promise<PermissionOverride[]> {
  const rows = await db
    .select({
      userId: permissionOverride.userId,
      role: permissionOverride.role,
      capability: permissionOverride.capability,
      effect: permissionOverride.effect,
    })
    .from(permissionOverride)
  return rows.flatMap((row) => {
    if (!isCommunityCapability(row.capability)) return []
    return [
      {
        userId: row.userId,
        role: row.role,
        capability: row.capability,
        effect: row.effect,
      },
    ]
  })
}

export async function listOverrideRows() {
  return db
    .select({
      id: permissionOverride.id,
      userId: permissionOverride.userId,
      email: user.email,
      role: permissionOverride.role,
      capability: permissionOverride.capability,
      effect: permissionOverride.effect,
    })
    .from(permissionOverride)
    .leftJoin(user, eq(user.id, permissionOverride.userId))
}

export async function addPermissionOverride(data: {
  userId: string | null
  role: CommunityRole | null
  capability: string
  effect: "grant" | "revoke"
  createdBy: string
}) {
  const [row] = await db
    .insert(permissionOverride)
    .values(data)
    .returning({ id: permissionOverride.id })
  return row
}

export async function deletePermissionOverride(id: string) {
  await db.delete(permissionOverride).where(eq(permissionOverride.id, id))
}

export async function listInvites(communityId: string) {
  return db
    .select({
      id: communityInvite.id,
      email: communityInvite.email,
      role: communityInvite.role,
      createdAt: communityInvite.createdAt,
    })
    .from(communityInvite)
    .where(eq(communityInvite.communityId, communityId))
}

export async function upsertInvite(data: {
  communityId: string
  email: string
  role: CommunityRole
  invitedBy: string
}) {
  await db
    .insert(communityInvite)
    .values(data)
    .onConflictDoUpdate({
      target: [communityInvite.communityId, communityInvite.email],
      set: { role: data.role, invitedBy: data.invitedBy },
    })
}

export async function claimInvites(userId: string, email: string) {
  const pending = await db
    .select({
      id: communityInvite.id,
      communityId: communityInvite.communityId,
      role: communityInvite.role,
      invitedBy: communityInvite.invitedBy,
    })
    .from(communityInvite)
    .innerJoin(community, eq(community.id, communityInvite.communityId))
    .where(
      and(
        eq(communityInvite.email, email.trim().toLowerCase()),
        eq(community.isActive, true),
        eq(community.approvalStatus, "approved")
      )
    )
  for (const invite of pending) {
    await upsertMember({
      communityId: invite.communityId,
      userId,
      role: invite.role,
      addedBy: invite.invitedBy ?? userId,
    })
    await db.delete(communityInvite).where(eq(communityInvite.id, invite.id))
  }
  return pending
}

export async function listEventHosts(postId: string) {
  return db
    .select({
      id: eventHost.id,
      userId: eventHost.userId,
      name: user.name,
      email: user.email,
    })
    .from(eventHost)
    .innerJoin(user, eq(user.id, eventHost.userId))
    .where(eq(eventHost.postId, postId))
}

export async function addEventHost(data: {
  postId: string
  userId: string
  addedBy: string
}) {
  await db
    .insert(eventHost)
    .values(data)
    .onConflictDoNothing({ target: [eventHost.postId, eventHost.userId] })
}

export async function removeEventHost(postId: string, userId: string) {
  await db
    .delete(eventHost)
    .where(and(eq(eventHost.postId, postId), eq(eventHost.userId, userId)))
}

export async function listHostedPostIds(userId: string, communityId?: string) {
  const rows = await db
    .select({ id: post.id })
    .from(eventHost)
    .innerJoin(post, eq(post.id, eventHost.postId))
    .where(
      and(
        eq(eventHost.userId, userId),
        communityId ? eq(post.communityId, communityId) : undefined
      )
    )
  return rows.map((row) => row.id)
}
