import assert from "node:assert/strict"
import type { Pool } from "pg"
import { verifyPrincipal } from "@/db/pool"

export async function testPrincipalBoundaries(
  owner: Pool,
  app: Pool,
  auth: Pool
) {
  await assert.rejects(verifyPrincipal(owner, "vboard_app"))
  await assert.rejects(verifyPrincipal(owner, "vboard_auth"))
  await assert.rejects(auth.query("SELECT * FROM public.profile"))
  await assert.rejects(
    auth.query("SELECT * FROM vboard_private.super_admin_email")
  )
  await assert.rejects(
    auth.query("DELETE FROM public.\"user\" WHERE id='student'")
  )
  await assert.rejects(app.query('SELECT * FROM public."user"'))
  await assert.rejects(
    app.query("SELECT * FROM vboard_private.legacy_authority")
  )
}
