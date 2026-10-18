import assert from "node:assert/strict"
import type { Pool } from "pg"
import { verifyPrincipal } from "@/db/pool"

export async function testPrincipalBoundaries(owner: Pool, app: Pool) {
  await assert.rejects(verifyPrincipal(owner))
  await verifyPrincipal(app)
  assert.equal((await app.query("SELECT * FROM public.profile")).rows.length, 0)
  await assert.rejects(
    app.query("SELECT * FROM vboard_private.legacy_authority")
  )
  await assert.rejects(
    app.query("SELECT * FROM vboard_private.super_admin_email")
  )
  const client = await app.connect()
  try {
    await client.query("BEGIN")
    await client.query(`INSERT INTO public."user"(id,name,email,email_verified,created_at,updated_at)
      VALUES('auth-boundary','Auth boundary','auth-boundary@vit.edu.in',true,now(),now())`)
    await client.query(`INSERT INTO public.session(id,user_id,token,expires_at,created_at,updated_at)
      VALUES('auth-boundary','auth-boundary','auth-boundary-token',now()+interval '1 day',now(),now())`)
    await client.query(`INSERT INTO public.account(id,user_id,account_id,provider_id,created_at,updated_at)
      VALUES('auth-boundary','auth-boundary','auth-boundary','voss',now(),now())`)
    await client.query(`INSERT INTO public.verification(id,identifier,value,expires_at)
      VALUES('auth-boundary','auth-boundary','test-value',now()+interval '1 day')`)
    for (const table of ['"user"', "session", "account", "verification"]) {
      assert.equal(
        (
          await client.query(
            `SELECT id FROM public.${table} WHERE id='auth-boundary'`
          )
        ).rowCount,
        1
      )
      assert.equal(
        (
          await client.query(
            `UPDATE public.${table} SET updated_at=now() WHERE id='auth-boundary'`
          )
        ).rowCount,
        1
      )
    }
    for (const table of ["session", "account", "verification", '"user"'])
      assert.equal(
        (
          await client.query(
            `DELETE FROM public.${table} WHERE id='auth-boundary'`
          )
        ).rowCount,
        1
      )
  } finally {
    await client.query("ROLLBACK")
    client.release()
  }
}
