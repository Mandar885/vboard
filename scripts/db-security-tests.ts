import assert from "node:assert/strict"
import { Pool, type PoolClient } from "pg"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import type { DbContext } from "@/db"
import * as schema from "@/db/schema"
import { testPrincipalBoundaries } from "./db-principal-tests"
import {
  listFeed,
  getPostDetailBySlug,
  createPost,
  deletePost,
  type PostInput,
} from "@/db/queries/posts"
import {
  registerForEvent,
  decideRegistrations,
  listUserRegistrations,
} from "@/db/queries/registrations"
import { createAuditLog } from "@/db/queries/audit"
import { upsertMember } from "@/db/queries/members"
import { listMembers } from "@/db/queries/members"
import { updateCommunity } from "@/db/queries/communities"
import { IDS } from "./db-test-fixtures"
type TestPools = {
  owner: Pool
  app: Pool
  appUrl: string
}
export async function adminFixture(
  owner: Pool,
  work: (client: PoolClient) => Promise<void>
) {
  const client = await owner.connect()
  try {
    await client.query("BEGIN")
    await client.query("SET LOCAL session_replication_role=replica")
    await work(client)
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
export async function runSecurityTests({ owner, app, appUrl }: TestPools) {
  const db = drizzle(app, { schema })
  const asActor = <T>(
    actorId: string | null,
    work: (ctx: DbContext) => Promise<T>
  ) =>
    db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('vboard.actor_id',${actorId ?? ""},true)`
      )
      await tx.execute(sql`select vboard_api.actor_id()`)
      return work({ tx, actorId })
    })
  const deny = async (
    actor: string | null,
    query: string,
    params: unknown[] = []
  ) => {
    try {
      const result = await asActor(actor, (ctx) =>
        ctx.tx.execute(
          sql.raw(
            query.replace(
              /\$(\d+)/g,
              (_match, number) =>
                `'${String(params[Number(number) - 1]).replaceAll("'", "''")}'`
            )
          )
        )
      )
      assert.equal(result.rowCount, 0)
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error
    }
  }
  await testPrincipalBoundaries(owner, app)
  await deny("student", "DELETE FROM public.registration")
  await deny("student", "TRUNCATE public.post")
  await deny("student", "SET ROLE vboard_guard")
  await assert.rejects(asActor("unknown", async () => null))
  assert.equal(
    (
      await asActor(null, (ctx) =>
        ctx.tx.execute(sql`select * from public.registration`)
      )
    ).rows.length,
    0
  )
  assert.equal(
    (
      await asActor("student", (ctx) =>
        ctx.tx.execute(sql`select * from public.post`)
      )
    ).rows.length,
    0
  )
  const visitor = await asActor(null, listFeed)
  assert.equal(visitor.length, 3)
  assert(visitor.every((row) => row.location === null))
  assert(visitor.every((row) => row.startsAt instanceof Date))
  assert.equal(
    await asActor(null, (ctx) => getPostDetailBySlug(ctx, IDS.hidden)),
    null
  )
  assert(
    (await asActor("student", listFeed)).some((row) => row.id === IDS.private)
  )
  const mixed = await Promise.all(
    ["student", "lead", null].map((actor) =>
      asActor(actor, async (ctx) => ({
        actor: (
          await ctx.tx.execute<{ actor: string | null }>(
            sql`select vboard_api.actor_id() actor`
          )
        ).rows[0].actor,
        rows: await listFeed(ctx),
      }))
    )
  )
  assert.deepEqual(
    mixed.map((row) => row.actor),
    ["student", "lead", null]
  )
  await assert.rejects(
    asActor("student", (ctx) =>
      upsertMember(ctx, {
        communityId: IDS.community,
        userId: "student",
        role: "lead",
      })
    )
  )
  await assert.rejects(
    asActor("lead", (ctx) =>
      upsertMember(ctx, {
        communityId: IDS.community,
        userId: "student",
        role: "lead",
      })
    )
  )
  await assert.rejects(
    asActor("organizer", (ctx) => listMembers(ctx, IDS.community))
  )
  await asActor("lead", (ctx) =>
    updateCommunity(ctx, IDS.community, {
      name: "Updated",
      description: "Settings",
      logoUrl: null,
    })
  )
  const input: PostInput = {
    title: "Atomic",
    body: "Body",
    visibility: "public",
    isPinned: false,
    isEvent: false,
    startsAt: null,
    endsAt: null,
    location: null,
    locationVisibility: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
    capacity: null,
    requiresApproval: false,
  }
  await assert.rejects(
    asActor("organizer", (ctx) =>
      createPost(ctx, {
        ...input,
        slug: "forged",
        communityId: IDS.otherCommunity,
        status: "draft",
      })
    )
  )
  await deny(
    "organizer",
    "UPDATE public.post SET author_id='student' WHERE id=$1",
    [IDS.event]
  )
  await deny(
    "organizer",
    "UPDATE public.community_member SET role='lead' WHERE id=$1",
    [IDS.organizer]
  )
  const auditCount = (
    await owner.query("SELECT count(*)::int n FROM public.audit_log")
  ).rows[0].n
  await assert.rejects(
    asActor("organizer", async (ctx) => {
      const row = await createPost(ctx, {
        ...input,
        slug: "rollback-proof",
        communityId: IDS.community,
        status: "draft",
      })
      await createAuditLog(ctx, {
        action: "invalid",
        targetType: "profile",
        targetId: row.id,
      })
    })
  )
  assert.equal(
    (
      await owner.query(
        "SELECT count(*)::int n FROM public.post WHERE slug='rollback-proof'"
      )
    ).rows[0].n,
    0
  )
  assert.equal(
    (await owner.query("SELECT count(*)::int n FROM public.audit_log")).rows[0]
      .n,
    auditCount
  )
  const allocations = await Promise.allSettled(
    ["student", "student2"].map((actor) =>
      asActor(actor, (ctx) => registerForEvent(ctx, IDS.event))
    )
  )
  assert.equal(
    allocations.filter((result) => result.status === "fulfilled").length,
    1
  )
  assert.equal(
    (
      await owner.query(
        "SELECT count(*)::int n FROM public.registration WHERE post_id=$1 AND status='approved'",
        [IDS.event]
      )
    ).rows[0].n,
    1
  )
  const winner = (
    await owner.query(
      "SELECT user_id FROM public.registration WHERE post_id=$1",
      [IDS.event]
    )
  ).rows[0].user_id as string
  const publicEvent = await asActor(null, (ctx) =>
    getPostDetailBySlug(ctx, IDS.event)
  )
  assert.equal(publicEvent?.seatsTaken, 1)
  assert.equal(publicEvent?.location, null)
  assert.equal(
    (await asActor(winner, (ctx) => getPostDetailBySlug(ctx, IDS.event)))
      ?.location,
    "Secret room"
  )
  await deny(
    winner,
    "UPDATE public.registration SET decided_by='organizer' WHERE post_id=$1",
    [IDS.event]
  )
  await deny("organizer", "UPDATE public.post SET capacity=0 WHERE id=$1", [
    IDS.event,
  ])
  await deny(
    "organizer",
    "UPDATE public.post SET community_id=$1 WHERE id=$2",
    [IDS.otherCommunity, IDS.event]
  )
  await Promise.all(
    ["student", "student2"].map((actor) =>
      asActor(actor, (ctx) => registerForEvent(ctx, IDS.approval))
    )
  )
  const pending = (
    await owner.query<{ id: string; user_id: string }>(
      "SELECT id,user_id FROM public.registration WHERE post_id=$1 ORDER BY user_id",
      [IDS.approval]
    )
  ).rows
  const approvals = await Promise.allSettled(
    pending.map((row) =>
      asActor("organizer", (ctx) =>
        decideRegistrations(ctx, {
          postId: IDS.approval,
          ids: [row.id],
          decision: "approve",
        })
      )
    )
  )
  assert.equal(
    approvals.filter((result) => result.status === "fulfilled").length,
    1
  )
  const rejected =
    pending[approvals.findIndex((result) => result.status === "rejected")]
  await asActor("organizer", (ctx) =>
    decideRegistrations(ctx, {
      postId: IDS.approval,
      ids: [rejected.id],
      decision: "reject",
    })
  )
  await assert.rejects(
    asActor(rejected.user_id, (ctx) => registerForEvent(ctx, IDS.approval))
  )
  await assert.rejects(
    asActor("organizer", (ctx) =>
      decideRegistrations(ctx, {
        postId: IDS.event,
        ids: [rejected.id],
        decision: "approve",
      })
    )
  )
  await asActor("organizer", (ctx) => deletePost(ctx, IDS.community, IDS.event))
  assert.equal(
    await asActor(winner, (ctx) => getPostDetailBySlug(ctx, IDS.event)),
    null
  )
  const history = await asActor(winner, (ctx) =>
    listUserRegistrations(ctx, winner)
  )
  assert(history.some((row) => row.postId === IDS.event))
  assert(history.every((row) => !("body" in row) && !("location" in row)))
  await assert.rejects(
    asActor("outsider", (ctx) => listUserRegistrations(ctx, winner))
  )
  await adminFixture(owner, async (client) => {
    await client.query(
      "UPDATE public.community_member SET is_active=false WHERE id=$1",
      [IDS.organizer]
    )
  })
  await assert.rejects(
    asActor("organizer", (ctx) =>
      createPost(ctx, {
        ...input,
        slug: "revoked",
        communityId: IDS.community,
        status: "draft",
      })
    )
  )
  assert.equal(
    (
      await asActor(null, (ctx) =>
        ctx.tx.execute<{ actor: string | null }>(
          sql`select vboard_api.actor_id() actor`
        )
      )
    ).rows[0].actor,
    null
  )
  process.env.DATABASE_URL = appUrl
  const { withDb, closeDatabase } = await import("@/db/context")
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
  await assert.rejects(
    withDb({ userId: "student" }, async () => {
      throw new Error("rollback")
    })
  )
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
}
