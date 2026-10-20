"use server"
import { revalidatePath } from "next/cache"
import { withDb } from "@/db"
import { updateProfile } from "@/db/queries/profiles"
import { firstIssue, profileFormSchema } from "@/db/validations"
import { done, fail, type ActionResult } from "@/lib/action-result"
import { attemptAction } from "@/lib/action-error"
import { getSessionUser } from "@/lib/session"
export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getSessionUser()
  if (!user) return fail("Sign in first.")
  const parsed = profileFormSchema.safeParse({
    rollNumber: formData.get("rollNumber") ?? "",
    bio: formData.get("bio") ?? "",
  })
  if (!parsed.success) return fail(firstIssue(parsed.error))
  const result = await attemptAction(() =>
    withDb({ userId: user.id }, async (ctx) => {
      await updateProfile(ctx, parsed.data)
      return done("Profile saved.")
    })
  )
  if (result.ok) {
    revalidatePath("/dashboard", "layout")
  }
  return result
}
