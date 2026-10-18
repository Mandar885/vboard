"use server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { withDb } from "@/db"
import {
  createCommunity,
  getCommunityById,
  getCommunityBySlug,
  setCommunityActive,
} from "@/db/queries/communities"
import { getUserByEmail } from "@/db/queries/profiles"
import { firstIssue, newCommunitySchema } from "@/db/validations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { attemptAction } from "@/lib/action-error"
import { isCollegeEmail } from "@/lib/identity"
import { siteCan } from "@/lib/rbac"
import { getSessionUser } from "@/lib/session"

export async function createCommunityAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user || !siteCan(user.siteRole, "community:create"))
    return fail("Only Super admin can create communities.")
  const parsed = newCommunitySchema.safeParse({
    name: formData.get("name") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    leadEmail: formData.get("leadEmail") ?? "",
  })
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const result = await attemptAction(() =>
    withDb({ userId: user.id }, async (ctx) => {
      const { leadEmail, ...data } = parsed.data
      if (await getCommunityBySlug(ctx, data.slug))
        return fail("That address is taken.")
      if (leadEmail && !isCollegeEmail(leadEmail))
        return fail("The Lead needs a @vit.edu.in address.")
      const lead = leadEmail ? await getUserByEmail(ctx, leadEmail) : null
      if (leadEmail && !lead)
        return fail("The Lead has not signed in to vboard yet.")
      await createCommunity(ctx, {
        ...data,
        ...(lead ? { leadUserId: lead.id } : {}),
      })
      return done(`${data.name} created.`)
    })
  )
  if (result.ok) {
    revalidatePath("/dashboard", "layout")
    revalidatePath("/communities")
  }
  return result
}
export async function setCommunityActiveAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user || !siteCan(user.siteRole, "community:archive"))
    return fail("Only Super admin can archive communities.")
  const input = z
    .object({ communityId: z.uuid(), active: z.enum(["true", "false"]) })
    .strict()
    .safeParse({
      communityId: formData.get("communityId"),
      active: formData.get("active"),
    })
  if (!input.success) return fail("Unknown community change.")
  const result = await attemptAction(() =>
    withDb({ userId: user.id }, async (ctx) => {
      const community = await getCommunityById(ctx, input.data.communityId)
      if (!community) return fail("Unknown community.")
      await setCommunityActive(ctx, community.id, input.data.active === "true")
      return done(
        input.data.active === "true"
          ? "Community restored."
          : "Community archived."
      )
    })
  )
  if (result.ok) {
    revalidatePath("/dashboard", "layout")
    revalidatePath("/communities")
    revalidatePath("/")
  }
  return result
}
