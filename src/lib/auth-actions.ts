"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionCookie } from "better-auth/cookies"
import { auth, verifyAuthDatabase } from "@/lib/auth"
import { DEV_ACTOR_COOKIE } from "@/lib/dev-auth-gate"
import { fail, type ActionResult } from "@/lib/action-result"
import { revokeProductSession } from "@/lib/auth-session"

export async function signOutAction(): Promise<ActionResult> {
  const jar = await cookies()
  const requestHeaders = await headers()
  if (getSessionCookie(requestHeaders)) {
    try {
      await verifyAuthDatabase()
      await revokeProductSession(auth.api, requestHeaders)
    } catch {
      return fail("Sign-out did not complete. Try again.")
    }
  }
  if (jar.get(DEV_ACTOR_COOKIE)) jar.delete(DEV_ACTOR_COOKIE)
  redirect("/")
}
