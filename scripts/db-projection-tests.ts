import assert from "node:assert/strict"
import type { Pool } from "pg"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import type { DbContext } from "@/db"
import * as schema from "@/db/schema"
import {
  listFeed,
  listEvents,
  listCommunityPosts,
  listDashboardEvents,
  listUpcomingEventsForCommunities,
} from "@/db/queries/posts"
import { listPendingForCommunities } from "@/db/queries/registrations"
import { adminFixture } from "./db-security-tests"
import { IDS } from "./db-test-fixtures"

export async function testFilteredProjections(owner: Pool, app: Pool) {
  const db = drizzle(app, { schema })
  const asActor = <T>(
    actorId: string | null,
    work: (ctx: DbContext) => Promise<T>
  ) =>
    db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('vboard.actor_id',${actorId ?? ""},true)`
      )
      return work({ tx, actorId })
    })
  const target = "20000000-0000-4000-8000-000000000011"
  const past = "20000000-0000-4000-8000-000000000012"
  const draft = "20000000-0000-4000-8000-000000000013"
  const pendingTarget = "20000000-0000-4000-8000-000000000014"
  const pendingNoise = "20000000-0000-4000-8000-000000000015"
  const now = new Date()
  await adminFixture(owner, async (client) => {
    await client.query(
      "UPDATE public.community_member SET is_active=true WHERE id=$1",
      [IDS.organizer]
    )
    await client.query(
      `INSERT INTO public.community_member(community_id,user_id,role) VALUES($1,'lead','lead')`,
      [IDS.otherCommunity]
    )
    await client.query(
      `INSERT INTO public.post(slug,community_id,author_id,title,body,status,created_at)
      SELECT 'noise-other-'||n,$1,'organizer','Latest announcement '||n,'Body','published','2030-01-01'::timestamptz+n*interval '1 minute'
      FROM generate_series(1,551) n`,
      [IDS.otherCommunity]
    )
    await client.query(
      `INSERT INTO public.post(id,slug,community_id,author_id,title,body,status,is_event,starts_at,ends_at,location,location_visibility,created_at)
      VALUES($1::uuid,$1::text,$2,'organizer','Needle 100%_literal','Body','published',true,now()+interval '1 day',now()+interval '2 days','Protected room','after_approval','2020-01-01')`,
      [target, IDS.community]
    )
    await client.query(
      `INSERT INTO public.post(id,slug,community_id,author_id,title,body,status,is_event,starts_at,ends_at,location_visibility,created_at)
      VALUES($1::uuid,$1::text,$2,'organizer','Needle past','Body','completed',true,now()-interval '2 days',now()-interval '1 day','public','2020-01-01')`,
      [past, IDS.community]
    )
    await client.query(
      `INSERT INTO public.post(id,slug,community_id,author_id,title,body,status,is_event,starts_at,ends_at,location_visibility,created_at)
      VALUES($1::uuid,$1::text,$2,'organizer','Needle draft','Body','draft',true,now()+interval '3 days',now()+interval '4 days','public','2020-01-01')`,
      [draft, IDS.community]
    )
  })
  const scopedFeed = await asActor(null, (ctx) =>
    listFeed(ctx, { communityId: IDS.community })
  )
  assert(scopedFeed.some((row) => row.id === target))
  assert(scopedFeed.every((row) => row.communityId === IDS.community))
  assert.equal(scopedFeed.find((row) => row.id === target)?.location, null)
  const events = await asActor(null, listEvents)
  assert(events.some((row) => row.id === target))
  assert(events.every((row) => row.isEvent))
  assert(
    events.every(
      (row, index) =>
        index === 0 || row.startsAt! >= events[index - 1].startsAt!
    )
  )
  await adminFixture(owner, async (client) => {
    await client.query(
      `INSERT INTO public.post(slug,community_id,author_id,title,body,status,created_at)
      SELECT 'noise-own-'||n,$1,'organizer','Own announcement '||n,'Body','published','2031-01-01'::timestamptz+n*interval '1 minute'
      FROM generate_series(1,501) n`,
      [IDS.community]
    )
    await client.query(
      `INSERT INTO public.post(slug,community_id,author_id,title,body,status,is_event,starts_at,ends_at,location_visibility,created_at)
      SELECT 'noise-event-'||n,$1,'organizer','Other future '||n,'Body','published',true,
        now()+interval '30 days'+n*interval '1 minute',now()+interval '31 days'+n*interval '1 minute','public','2032-01-01'
      FROM generate_series(1,220) n`,
      [IDS.otherCommunity]
    )
    await client.query(
      `INSERT INTO public.post(id,slug,community_id,author_id,title,body,status,is_event,starts_at,ends_at,location_visibility,requires_approval,created_at)
      VALUES($1::uuid,$1::text,$2,'organizer','Pending target','Body','published',true,now()+interval '5 days',now()+interval '6 days','public',true,'2020-01-01'),
        ($3::uuid,$3::text,$4,'organizer','Pending noise','Body','published',true,now()+interval '5 days',now()+interval '6 days','public',true,'2033-01-01')`,
      [pendingTarget, IDS.community, pendingNoise, IDS.otherCommunity]
    )
    await client.query(`INSERT INTO public."user"(id,name,email,email_verified,created_at,updated_at)
      SELECT 'pending-person-'||n,'Pending '||n,'pending'||n||'@vit.edu.in',true,now(),now() FROM generate_series(1,121) n`)
    await client.query(
      `INSERT INTO public.registration(post_id,user_id,status,registered_at)
      SELECT $1,'pending-person-'||n,'pending','2019-01-01'::timestamptz+n*interval '1 minute' FROM generate_series(1,120) n`,
      [pendingNoise]
    )
    await client.query(
      `INSERT INTO public.registration(post_id,user_id,status,registered_at)
      VALUES($1,'pending-person-121','pending','2020-01-01')`,
      [pendingTarget]
    )
  })
  const communityPosts = await asActor("organizer", (ctx) =>
    listCommunityPosts(ctx, IDS.community)
  )
  assert(communityPosts.length > 500)
  assert(communityPosts.some((row) => row.id === target))
  assert(communityPosts.every((row) => row.communityId === IDS.community))
  await assert.rejects(
    asActor("student", (ctx) => listCommunityPosts(ctx, IDS.community))
  )
  await assert.rejects(
    asActor("organizer", (ctx) => listCommunityPosts(ctx, IDS.otherCommunity))
  )
  const filters = {
    q: "100%_literal",
    communitySlug: "one",
    when: "upcoming" as const,
    status: "published" as const,
    now,
  }
  const dashboard = await asActor("lead", (ctx) =>
    listDashboardEvents(ctx, filters)
  )
  assert.deepEqual(
    dashboard.map((row) => row.id),
    [target]
  )
  assert.equal(
    (
      await asActor("lead", (ctx) =>
        listDashboardEvents(ctx, { ...filters, q: "100%Xliteral" })
      )
    ).length,
    0
  )
  const pastEvents = await asActor("lead", (ctx) =>
    listDashboardEvents(ctx, {
      ...filters,
      q: "Needle",
      status: "completed",
      when: "past",
    })
  )
  assert.deepEqual(
    pastEvents.map((row) => row.id),
    [past]
  )
  const privateDrafts = await asActor("lead", (ctx) =>
    listDashboardEvents(ctx, { ...filters, q: "Needle", status: "draft" })
  )
  assert.deepEqual(
    privateDrafts.map((row) => row.id),
    [draft]
  )
  assert.equal(
    (
      await asActor("student", (ctx) =>
        listDashboardEvents(ctx, { ...filters, q: "Needle", status: "draft" })
      )
    ).length,
    0
  )
  const upcoming = await asActor("organizer", (ctx) =>
    listUpcomingEventsForCommunities(ctx, [IDS.community], now)
  )
  assert(upcoming.some((row) => row.id === target))
  assert(upcoming.every((row) => row.communityId === IDS.community))
  assert.equal(
    (
      await asActor("organizer", (ctx) =>
        listUpcomingEventsForCommunities(ctx, [IDS.otherCommunity], now)
      )
    ).length,
    0
  )
  assert.equal(
    (
      await asActor("student", (ctx) =>
        listUpcomingEventsForCommunities(ctx, [IDS.community], now)
      )
    ).length,
    0
  )
  const pending = await asActor("lead", (ctx) =>
    listPendingForCommunities(ctx, [IDS.community])
  )
  assert(pending.some((row) => row.postId === pendingTarget))
  assert(pending.every((row) => row.communityId === IDS.community))
  assert.equal(
    (
      await asActor("organizer", (ctx) =>
        listPendingForCommunities(ctx, [IDS.otherCommunity])
      )
    ).length,
    0
  )
  assert.equal(
    (
      await asActor("student", (ctx) =>
        listPendingForCommunities(ctx, [IDS.community])
      )
    ).length,
    0
  )
  const publicCalendar = await asActor(null, listEvents)
  assert(publicCalendar.length > 200)
  assert(publicCalendar.some((row) => row.id === target))
  assert.equal(publicCalendar.find((row) => row.id === target)?.location, null)
}
