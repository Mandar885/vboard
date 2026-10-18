"use server"
import { revalidatePath } from "next/cache"
import { withDb } from "@/db"
import { updateCommunity } from "@/db/queries/communities"
import { firstIssue, communityFormSchema } from "@/db/validations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { attemptAction } from "@/lib/action-error"
import { actionCommunityAccess } from "@/lib/session"
export async function updateCommunityAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const access = await actionCommunityAccess(
    formData.get("slug"),
    "community:update"
  )
  if (!access) return fail("You cannot edit this community.")
  const parsed = communityFormSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    logoUrl: formData.get("logoUrl") ?? "",
  })
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const result = await attemptAction(() =>
    withDb({ userId: access.user.id }, async (ctx) => {
      await updateCommunity(ctx, access.community.id, parsed.data)
      return done("Community updated.")
    })
  )
  if (result.ok) {
    revalidatePath(`/dashboard/c/${access.community.slug}`, "layout")
    revalidatePath(`/communities/${access.community.slug}`)
    revalidatePath("/communities")
  }
  return result
}
