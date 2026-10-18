"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { withDb, type DbContext } from "@/db"
import {
  deactivateMember,
  getMember,
  getMemberById,
  setMemberRole,
  upsertMember,
} from "@/db/queries/members"
import { getUserByEmail } from "@/db/queries/profiles"
import { firstIssue, memberFormSchema } from "@/db/validations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { attemptAction } from "@/lib/action-error"
import { isCollegeEmail } from "@/lib/identity"
import {
  assignableCommunityRoles,
  canChangeMember,
  COMMUNITY_ROLE_LABEL,
} from "@/lib/rbac"
import { actionCommunityAccess, type CommunityAccess } from "@/lib/session"
const roleSchema = z.enum(["lead", "organizer"])
function revalidateTeam(slug: string) {
  revalidatePath(`/dashboard/c/${slug}`, "layout")
  revalidatePath("/dashboard", "layout")
}
export async function addMemberAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionCommunityAccess(
    formData.get("slug"),
    "member:manage"
  )
  if (!access) return fail("You cannot manage this team.")
  const parsed = memberFormSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  })
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const { email, role } = parsed.data
  if (
    !assignableCommunityRoles(access.user.siteRole, access.role).includes(role)
  )
    return fail("You cannot appoint that role.")
  if (!isCollegeEmail(email)) return fail("Use a @vit.edu.in address.")
  const result = await attemptAction(() =>
    withDb({ userId: access.user.id }, async (ctx) => {
      const target = await getUserByEmail(ctx, email, access.community.id)
      if (!target)
        return fail(
          "No vboard account for that email yet. Ask them to sign in once with VOSS, then add them."
        )
      const existing = await getMember(ctx, access.community.id, target.id)
      if (
        existing &&
        !canChangeMember(
          { siteRole: access.user.siteRole, communityRole: access.role },
          { role: existing.role, isSelf: target.id === access.user.id }
        )
      )
        return fail("You cannot change that member.")
      await upsertMember(ctx, {
        communityId: access.community.id,
        userId: target.id,
        role,
      })
      return done(`${target.name} appointed as ${COMMUNITY_ROLE_LABEL[role]}.`)
    })
  )
  if (result.ok) revalidateTeam(access.community.slug)
  return result
}
async function memberTarget(
  ctx: DbContext,
  access: CommunityAccess,
  memberId: unknown
) {
  const id = z.uuid().safeParse(memberId)
  if (!id.success) return null
  const member = await getMemberById(ctx, id.data)
  if (!member || member.communityId !== access.community.id || !member.isActive)
    return null
  return canChangeMember(
    { siteRole: access.user.siteRole, communityRole: access.role },
    { role: member.role, isSelf: member.userId === access.user.id }
  )
    ? member
    : null
}
export async function changeMemberRoleAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionCommunityAccess(
    formData.get("slug"),
    "member:manage"
  )
  if (!access) return fail("You cannot manage this team.")
  const role = roleSchema.safeParse(formData.get("role"))
  if (
    !role.success ||
    !assignableCommunityRoles(access.user.siteRole, access.role).includes(
      role.data
    )
  )
    return fail("You cannot appoint that role.")
  const result = await attemptAction(() =>
    withDb({ userId: access.user.id }, async (ctx) => {
      const member = await memberTarget(ctx, access, formData.get("memberId"))
      if (!member) return fail("You cannot change that member.")
      await setMemberRole(ctx, access.community.id, member.id, role.data)
      return done(`Role changed to ${COMMUNITY_ROLE_LABEL[role.data]}.`)
    })
  )
  if (result.ok) revalidateTeam(access.community.slug)
  return result
}
export async function removeMemberAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionCommunityAccess(
    formData.get("slug"),
    "member:manage"
  )
  if (!access) return fail("You cannot manage this team.")
  const result = await attemptAction(() =>
    withDb({ userId: access.user.id }, async (ctx) => {
      const member = await memberTarget(ctx, access, formData.get("memberId"))
      if (!member) return fail("You cannot change that member.")
      await deactivateMember(ctx, access.community.id, member.id)
      return done("Removed from the team.")
    })
  )
  if (result.ok) revalidateTeam(access.community.slug)
  return result
}
