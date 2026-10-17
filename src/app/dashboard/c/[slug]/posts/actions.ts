"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createAuditLog } from "@/db/queries/audit"
import {
  createPost,
  deletePost,
  getPostById,
  setAdvisorApproval,
  setPostPinned,
  setPostStatus,
  updatePost,
} from "@/db/queries/posts"
import {
  listRegistrations,
  setRegistrationStatus,
} from "@/db/queries/registrations"
import { firstIssue, postFormSchema } from "@/db/validations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { isSiteAdmin, needsAdvisorApproval } from "@/lib/rbac"
import { randomSuffix, uniqueSlug } from "@/lib/slug"
import {
  actionCommunityAccess,
  actionPostAccess,
  type CommunityAccess,
} from "@/lib/session"

function readPostForm(formData: FormData) {
  const get = (key: string) => String(formData.get(key) ?? "")
  return postFormSchema.safeParse({
    title: get("title"),
    body: get("body"),
    visibility: get("visibility"),
    isPinned: get("isPinned"),
    isEvent: get("isEvent"),
    startsAt: get("startsAt"),
    endsAt: get("endsAt"),
    location: get("location"),
    locationVisibility: get("locationVisibility") || "public",
    registrationOpensAt: get("registrationOpensAt"),
    registrationClosesAt: get("registrationClosesAt"),
    capacity: get("capacity"),
    requiresApproval: get("requiresApproval"),
    intent: get("intent") || "save",
  })
}

function revalidateCommunity(slug: string, postSlug?: string) {
  revalidatePath(`/dashboard/c/${slug}`, "layout")
  revalidatePath(`/communities/${slug}`)
  revalidatePath("/")
  if (postSlug) revalidatePath(`/posts/${postSlug}`)
}

async function postInCommunity(access: CommunityAccess, postId: unknown) {
  const id = z.uuid().safeParse(postId)
  if (!id.success) return null
  const post = await getPostById(id.data)
  if (!post || post.communityId !== access.community.id) return null
  return post
}

export async function createPostAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionCommunityAccess(formData.get("slug"), "post:write")
  if (!access) return fail("You cannot post in this community.")
  const parsed = readPostForm(formData)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const { intent, ...data } = parsed.data
  const publish = intent === "publish" && access.can("post:publish")
  if (
    publish &&
    needsAdvisorApproval(data) &&
    !isSiteAdmin(access.user.siteRole)
  )
    return fail(
      "Events for 80 or more people need an advisor's approval before they are published."
    )

  const created = await createPost({
    ...data,
    slug: uniqueSlug(data.title, randomSuffix()),
    communityId: access.community.id,
    authorId: access.user.id,
    status: publish ? "published" : "draft",
  })
  await createAuditLog({
    actorId: access.user.id,
    action: publish ? "post.published" : "post.drafted",
    targetType: "post",
    targetId: created.id,
    communityId: access.community.id,
    details: { title: data.title, isEvent: data.isEvent },
  })
  revalidateCommunity(access.community.slug)
  redirect(`/dashboard/c/${access.community.slug}/posts/${created.id}`)
}

export async function updatePostAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionPostAccess(
    formData.get("slug"),
    formData.get("postId"),
    "post:write"
  )
  if (!access) return fail("You cannot edit posts in this community.")
  const post = await postInCommunity(access, formData.get("postId"))
  if (!post) return fail("Post not found.")
  const parsed = readPostForm(formData)
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const { intent: _intent, ...data } = parsed.data

  await updatePost(post.id, data)
  await createAuditLog({
    actorId: access.user.id,
    action: "post.updated",
    targetType: "post",
    targetId: post.id,
    communityId: access.community.id,
    details: { title: data.title },
  })
  revalidateCommunity(access.community.slug, post.slug)
  redirect(`/dashboard/c/${access.community.slug}/posts/${post.id}`)
}

export async function setPostStatusAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const status = z
    .enum(["published", "draft", "cancelled", "completed"])
    .safeParse(formData.get("status"))
  if (!status.success) return fail("Unknown status.")
  const access = await actionPostAccess(
    formData.get("slug"),
    formData.get("postId"),
    "post:publish"
  )
  if (!access) return fail("You cannot change this post.")
  const post = await postInCommunity(access, formData.get("postId"))
  if (!post) return fail("Post not found.")
  if (
    status.data === "published" &&
    needsAdvisorApproval(post) &&
    !post.advisorApprovedBy &&
    !isSiteAdmin(access.user.siteRole)
  )
    return fail(
      "Events for 80 or more people need an advisor's approval before they are published."
    )

  await setPostStatus(post.id, status.data)
  await createAuditLog({
    actorId: access.user.id,
    action: `post.${status.data}`,
    targetType: "post",
    targetId: post.id,
    communityId: access.community.id,
    details: { title: post.title },
  })
  revalidateCommunity(access.community.slug, post.slug)
  return done(
    `Post ${status.data === "draft" ? "moved to drafts" : status.data}.`
  )
}

export async function togglePinAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionPostAccess(
    formData.get("slug"),
    formData.get("postId"),
    "post:publish"
  )
  if (!access) return fail("You cannot pin posts here.")
  const post = await postInCommunity(access, formData.get("postId"))
  if (!post) return fail("Post not found.")
  await setPostPinned(post.id, !post.isPinned)
  revalidateCommunity(access.community.slug, post.slug)
  return done(post.isPinned ? "Unpinned." : "Pinned to the top of the feed.")
}

export async function deletePostAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionPostAccess(
    formData.get("slug"),
    formData.get("postId"),
    "post:delete"
  )
  if (!access) return fail("You cannot delete posts here.")
  const post = await postInCommunity(access, formData.get("postId"))
  if (!post) return fail("Post not found.")

  await deletePost(post.id)
  await createAuditLog({
    actorId: access.user.id,
    action: "post.deleted",
    targetType: "post",
    targetId: post.id,
    communityId: access.community.id,
    details: { title: post.title },
  })
  revalidateCommunity(access.community.slug, post.slug)
  redirect(`/dashboard/c/${access.community.slug}`)
}

const DECISIONS = {
  approve: { status: "approved", capability: "registration:decide" },
  reject: { status: "rejected", capability: "registration:decide" },
  checkin: { status: "attended", capability: "registration:checkin" },
  noshow: { status: "no_show", capability: "registration:checkin" },
  reset: { status: "approved", capability: "registration:checkin" },
} as const

export async function decideRegistrationsAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const decision = z
    .enum(["approve", "reject", "checkin", "noshow", "reset"])
    .safeParse(formData.get("decision"))
  if (!decision.success) return fail("Unknown action.")
  const { status, capability } = DECISIONS[decision.data]
  const access = await actionCommunityAccess(formData.get("slug"), capability)
  if (!access) return fail("You do not have permission for that.")
  const post = await postInCommunity(access, formData.get("postId"))
  if (!post) return fail("Event not found.")

  const ids = z
    .array(z.uuid())
    .safeParse(formData.getAll("registrationId").map(String))
  if (!ids.success || ids.data.length === 0)
    return fail("Select at least one registration.")

  const rows = await listRegistrations(post.id)
  const byId = new Map(rows.map((r) => [r.id, r]))
  const allowedFrom: Record<string, string[]> = {
    approve: ["pending", "rejected"],
    reject: ["pending", "approved"],
    checkin: ["approved", "no_show"],
    noshow: ["approved"],
    reset: ["attended", "no_show"],
  }
  const targets = ids.data.filter((id) =>
    allowedFrom[decision.data].includes(byId.get(id)?.status ?? "")
  )
  if (targets.length === 0) return fail("Nothing to change for that selection.")

  if (decision.data === "approve" && post.capacity !== null) {
    const taken = rows.filter((r) =>
      ["approved", "attended"].includes(r.status)
    ).length
    if (taken + targets.length > post.capacity)
      return fail(`Only ${Math.max(0, post.capacity - taken)} seats are left.`)
  }

  await setRegistrationStatus(targets, status, access.user.id)
  await createAuditLog({
    actorId: access.user.id,
    action: `registration.${decision.data}`,
    targetType: "post",
    targetId: post.id,
    communityId: access.community.id,
    details: { count: targets.length, title: post.title },
  })
  revalidateCommunity(access.community.slug, post.slug)
  return done(
    `${targets.length} registration${targets.length === 1 ? "" : "s"} updated.`
  )
}
