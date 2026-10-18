"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { findPersona } from "@/lib/dev-personas"
import { DEV_ACTOR_COOKIE, devAuthEnabled } from "@/lib/dev-auth-gate"
import { safeReturnPath } from "@/lib/auth-redirect"

export async function signInAsPersona(formData: FormData) {
  if (!devAuthEnabled()) throw new Error("Dev sign-in is disabled")
  const input = z
    .object({ persona: z.string().min(1).max(40), next: z.string().max(2048) })
    .strict()
    .safeParse({
      persona: formData.get("persona"),
      next: formData.get("next") ?? "",
    })
  if (!input.success) throw new Error("Unknown persona")
  const persona = findPersona(input.data.persona)
  if (!persona) throw new Error("Unknown persona")
  ;(await cookies()).set(DEV_ACTOR_COOKIE, persona.key, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  })
  redirect(safeReturnPath(input.data.next))
}
