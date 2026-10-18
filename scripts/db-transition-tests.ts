import assert from "node:assert/strict"
import type { Pool } from "pg"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import type { DbContext } from "@/db"
import * as schema from "@/db/schema"
import {
  registerForEvent,
  cancelRegistration,
  decideRegistrations,
} from "@/db/queries/registrations"
import { adminFixture } from "./db-security-tests"
import { IDS } from "./db-test-fixtures"

export async function testTransitionBoundaries(owner: Pool, app: Pool) {
  const db = drizzle(app, { schema })
  const asActor = <T>(
    actorId: string | null,
    work: (ctx: DbContext) => Promise<T>
  ) =>
    db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('vboard.actor_id', ${actorId ?? ""}, true)`
      )
      return work({ tx, actorId })
    })
  const event = "20000000-0000-4000-8000-000000000006"
  const attendance = "20000000-0000-4000-8000-000000000007"
  await adminFixture(owner, async (client) => {
    await client.query(
      "UPDATE public.community_member SET is_active=true WHERE id=$1",
      [IDS.organizer]
    )
    await client.query(
      `INSERT INTO public.post(id,slug,community_id,author_id,title,body,status,is_event,starts_at,ends_at,location_visibility,capacity)
      VALUES($1::uuid,$1::text,$2,'organizer','Capacity','Body','published',true,now()+interval '1 day',now()+interval '2 days','public',2)`,
      [event, IDS.community]
    )
    await client.query(
      `INSERT INTO public.post(id,slug,community_id,author_id,title,body,status,is_event,starts_at,ends_at,location_visibility,capacity)
      VALUES($1::uuid,$1::text,$2,'organizer','Attendance','Body','published',true,now()+interval '1 day',now()+interval '2 days','public',1)`,
      [attendance, IDS.community]
    )
    await client.query(
      "INSERT INTO public.registration(post_id,user_id,status) VALUES($1,'student','no_show'),($1,'student2','approved')",
      [attendance]
    )
  })
  await assert.rejects(
    asActor(null, (ctx) =>
      ctx.tx.execute(
        sql`insert into public.registration(post_id,user_id,status) values(${event}::uuid,'outsider','approved')`
      )
    )
  )
  await assert.rejects(
    asActor("outsider", (ctx) =>
      ctx.tx.execute(
        sql`insert into public.registration(post_id,user_id,status) values(${IDS.approval}::uuid,'outsider','approved')`
      )
    )
  )
  await assert.rejects(
    asActor("outsider", (ctx) =>
      ctx.tx.execute(
        sql`insert into public.registration(post_id,user_id,status,decided_by,decided_at) values(${event}::uuid,'outsider','approved','organizer',now())`
      )
    )
  )
  await assert.rejects(
    asActor("outsider", (ctx) =>
      ctx.tx.execute(
        sql`insert into public.registration(post_id,user_id,status,checked_in_at) values(${event}::uuid,'outsider','approved',now())`
      )
    )
  )
  const first = await asActor("student", (ctx) => registerForEvent(ctx, event))
  const second = await asActor("student2", (ctx) =>
    registerForEvent(ctx, event)
  )
  await assert.rejects(
    asActor("student", (ctx) =>
      ctx.tx.execute(
        sql`update public.registration set user_id='outsider' where id=${first.id}::uuid`
      )
    )
  )
  await assert.rejects(
    asActor("organizer", (ctx) =>
      ctx.tx.execute(
        sql`update public.registration set post_id=${IDS.approval}::uuid where id=${first.id}::uuid`
      )
    )
  )
  await assert.rejects(
    asActor("organizer", (ctx) =>
      ctx.tx.execute(
        sql`update public.post set capacity=1 where id=${event}::uuid`
      )
    )
  )
  assert.equal(
    (await owner.query("SELECT capacity FROM public.post WHERE id=$1", [event]))
      .rows[0].capacity,
    2
  )
  await assert.rejects(
    asActor("organizer", (ctx) =>
      ctx.tx.execute(
        sql`update public.post set is_event=false,starts_at=null,ends_at=null,location_visibility=null,capacity=null where id=${event}::uuid`
      )
    )
  )
  await asActor("student2", (ctx) => cancelRegistration(ctx, event))
  assert.equal(
    (
      await owner.query("SELECT status FROM public.registration WHERE id=$1", [
        second.id,
      ])
    ).rows[0].status,
    "cancelled"
  )
  assert.equal(
    (await asActor("student2", (ctx) => registerForEvent(ctx, event))).status,
    "approved"
  )
  const noShow = (
    await owner.query(
      "SELECT id FROM public.registration WHERE post_id=$1 AND user_id='student'",
      [attendance]
    )
  ).rows[0].id as string
  const audits = (
    await owner.query("SELECT count(*)::int n FROM public.audit_log")
  ).rows[0].n
  await assert.rejects(
    asActor("organizer", (ctx) =>
      decideRegistrations(ctx, {
        postId: attendance,
        ids: [noShow],
        decision: "reset",
      })
    )
  )
  assert.equal(
    (await owner.query("SELECT count(*)::int n FROM public.audit_log")).rows[0]
      .n,
    audits
  )
  assert.equal(
    (
      await owner.query("SELECT status FROM public.registration WHERE id=$1", [
        noShow,
      ])
    ).rows[0].status,
    "no_show"
  )
  await adminFixture(owner, async (client) => {
    await client.query(
      "UPDATE public.community SET is_active=false WHERE id=$1",
      [IDS.community]
    )
  })
  assert.equal(
    (
      await asActor("lead", (ctx) =>
        ctx.tx.execute<{ allowed: boolean }>(
          sql`select vboard_api.operates(${IDS.community}::uuid) allowed`
        )
      )
    ).rows[0].allowed,
    false
  )
  assert.equal(
    (
      await asActor("organizer", (ctx) =>
        ctx.tx.execute<{ allowed: boolean }>(
          sql`select vboard_api.operates(${IDS.community}::uuid) allowed`
        )
      )
    ).rows[0].allowed,
    false
  )
}
