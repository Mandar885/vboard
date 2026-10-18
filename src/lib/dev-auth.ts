import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { authDb, verifyAuthDatabase } from "@/db/auth-db"
import * as schema from "@/db/schema"
import { DEV_PERSONAS, findPersona, type DevPersona } from "@/lib/dev-personas"
import { DEV_ACTOR_COOKIE, devAuthEnabled } from "@/lib/dev-auth-gate"

export { DEV_ACTOR_COOKIE, devAuthEnabled } from "@/lib/dev-auth-gate"

export type DevIdentity = {
  id: string
  name: string
  email: string
  image: string | null
}

export async function devIdentity(): Promise<DevIdentity | null> {
  if (!devAuthEnabled()) return null

  const persona = findPersona((await cookies()).get(DEV_ACTOR_COOKIE)?.value)
  if (!persona) return null

  await verifyAuthDatabase()
  const row = await authDb.query.user.findFirst({
    where: eq(schema.user.email, persona.email),
    columns: { id: true, name: true, email: true, image: true },
  })
  if (!row) return null
  return { ...row, image: row.image ?? null }
}

export async function devAuthProps(): Promise<{
  personas: DevPersona[]
  current: string | null
} | null> {
  if (!devAuthEnabled()) return null
  const current = (await cookies()).get(DEV_ACTOR_COOKIE)?.value ?? null
  return { personas: DEV_PERSONAS, current }
}
