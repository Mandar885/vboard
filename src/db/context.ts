import type { Pool } from "pg"
import { sql } from "drizzle-orm"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { createPool, verifyPrincipal } from "@/db/pool"
import * as schema from "@/db/schema"

export type DbActor = Readonly<{ userId: string }>
export type DbTransaction = Parameters<
  Parameters<NodePgDatabase<typeof schema>["transaction"]>[0]
>[0]
export type DbContext = Readonly<{ tx: DbTransaction; actorId: string | null }>
let runtimePool: Pool | undefined
let database: NodePgDatabase<typeof schema> | undefined
let verified: Promise<void> | undefined

function getDatabase() {
  if (!database) {
    const pool = createPool("DATABASE_URL")
    runtimePool = pool
    verified = verifyPrincipal(pool, "vboard_app")
    database = drizzle(pool, { schema })
  }
  return database
}

export async function withDb<T>(
  actor: DbActor | null,
  work: (ctx: DbContext) => Promise<T>
): Promise<T> {
  const db = getDatabase()
  await verified
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('vboard.actor_id', ${actor?.userId ?? ""}, true)`
    )
    await tx.execute(sql`select vboard_api.actor_id()`)
    return work({ tx, actorId: actor?.userId ?? null })
  })
}

export async function closeDatabase() {
  await runtimePool?.end()
  runtimePool = undefined
  database = undefined
  verified = undefined
}
