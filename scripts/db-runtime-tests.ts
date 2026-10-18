import assert from "node:assert/strict"
import { sql } from "drizzle-orm"
import { withDb, closeDatabase } from "@/db/context"
import { authDb, verifyAuthDatabase, closeAuthDatabase } from "@/db/auth-db"

type RuntimeUrls = { ownerUrl: string; appUrl: string }
export async function testRuntimeBoundaries({ ownerUrl, appUrl }: RuntimeUrls) {
  await closeDatabase()
  process.env.DATABASE_URL = ownerUrl
  await assert.rejects(
    withDb({ userId: "student" }, async () => true),
    /restricted vboard_app/
  )
  await closeDatabase()
  process.env.DATABASE_URL = appUrl
  assert.equal(
    await withDb(
      { userId: "student" },
      async (ctx) =>
        (
          await ctx.tx.execute<{ actor: string }>(
            sql`select vboard_api.actor_id() actor`
          )
        ).rows[0].actor
    ),
    "student"
  )
  await assert.rejects(withDb({ userId: "unknown" }, async () => true))
  assert.equal(
    await withDb(
      null,
      async (ctx) =>
        (
          await ctx.tx.execute<{ actor: string | null }>(
            sql`select vboard_api.actor_id() actor`
          )
        ).rows[0].actor
    ),
    null
  )
  await closeDatabase()
  assert.throws(
    () => Reflect.get(authDb, "query"),
    /verification must complete/
  )
  delete process.env.DATABASE_URL
  process.env.AUTH_DATABASE_URL = ownerUrl
  await assert.rejects(verifyAuthDatabase(), /DATABASE_URL is not set/)
  process.env.DATABASE_URL = ownerUrl
  await assert.rejects(verifyAuthDatabase(), /restricted vboard_app/)
  assert.throws(
    () => Reflect.get(authDb, "query"),
    /verification must complete/
  )
  await closeAuthDatabase()
  process.env.DATABASE_URL = appUrl
  delete process.env.AUTH_DATABASE_URL
  await verifyAuthDatabase()
  assert.equal(
    (await authDb.execute<{ actor: string }>(sql`select current_user actor`))
      .rows[0].actor,
    "vboard_app"
  )
  await closeAuthDatabase()
}
