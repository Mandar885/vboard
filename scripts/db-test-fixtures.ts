import type { Pool } from "pg"

export const IDS = {
  community: "10000000-0000-4000-8000-000000000001",
  otherCommunity: "10000000-0000-4000-8000-000000000002",
  event: "20000000-0000-4000-8000-000000000001",
  approval: "20000000-0000-4000-8000-000000000002",
  hidden: "20000000-0000-4000-8000-000000000003",
  private: "20000000-0000-4000-8000-000000000004",
  secondEvent: "20000000-0000-4000-8000-000000000005",
  lead: "30000000-0000-4000-8000-000000000001",
  organizer: "30000000-0000-4000-8000-000000000002",
}
export async function seedSecurityFixture(pool: Pool) {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("SET LOCAL session_replication_role=replica")
    for (const actor of [
      "super",
      "lead",
      "organizer",
      "student",
      "student2",
      "outsider",
    ]) {
      await client.query(
        `INSERT INTO public."user"(id,name,email,email_verified,created_at,updated_at) VALUES($1,$1,$2,true,now(),now())`,
        [actor, `${actor}@vit.edu.in`]
      )
      await client.query(
        "INSERT INTO public.profile(user_id,roll_number) VALUES($1,$1)",
        [actor]
      )
    }
    await client.query(
      "INSERT INTO public.community(id,slug,name) VALUES($1,'one','One'),($2,'two','Two')",
      [IDS.community, IDS.otherCommunity]
    )
    await client.query(
      "INSERT INTO public.community_member(id,community_id,user_id,role) VALUES($1,$2,'lead','lead'),($3,$2,'organizer','organizer')",
      [IDS.lead, IDS.community, IDS.organizer]
    )
    for (const [id, title, requiresApproval, status, visibility, community] of [
      [IDS.event, "Immediate", false, "published", "public", IDS.community],
      [IDS.approval, "Approval", true, "published", "public", IDS.community],
      [IDS.hidden, "Hidden secret", false, "draft", "public", IDS.community],
      [IDS.private, "VIT only", false, "published", "vit_only", IDS.community],
      [
        IDS.secondEvent,
        "Second",
        false,
        "published",
        "public",
        IDS.otherCommunity,
      ],
    ])
      await client.query(
        `INSERT INTO public.post(id,slug,community_id,author_id,title,body,status,visibility,is_event,starts_at,ends_at,location,location_visibility,capacity,requires_approval)
      VALUES($1::uuid,$1::text,$2,'organizer',$3,'Private body',$4,$5,true,now()+interval '2 days',now()+interval '3 days','Secret room','after_approval',1,$6)`,
        [id, community, title, status, visibility, requiresApproval]
      )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
export async function seedLegacyFixture(pool: Pool) {
  await pool.query(`INSERT INTO public."user"(id,name,email,email_verified,created_at,updated_at) VALUES
    ('legacy','Legacy','legacy@vit.edu.in',true,'2020-01-01','2020-01-01')`)
  await pool.query(
    "INSERT INTO public.profile(user_id,site_role,admin_department) VALUES('legacy','admin','Computer Engineering')"
  )
  await pool.query(
    "INSERT INTO public.community(id,slug,name,department,approval_status) VALUES($1,'legacy','Legacy','CE','pending')",
    [IDS.community]
  )
  for (const [index, role, active] of [
    [1, "lead", true],
    [2, "manager", true],
    [3, "manager", false],
    [4, "volunteer", true],
    [5, "advisor", true],
  ] as const) {
    const userId = `legacy${index}`
    await pool.query(
      `INSERT INTO public."user"(id,name,email,email_verified,created_at,updated_at) VALUES($1,$1,$2,true,'2020-01-01','2020-01-01')`,
      [userId, `${userId}@vit.edu.in`]
    )
    await pool.query(
      "INSERT INTO public.community_member(community_id,user_id,role,is_active,joined_at,updated_at) VALUES($1,$2,$3,$4,'2020-01-01','2020-01-01')",
      [IDS.community, userId, role, active]
    )
  }
  await pool.query(
    `INSERT INTO public.post(id,slug,community_id,author_id,title,body,is_event,starts_at,ends_at,location_visibility,advisor_approved_by,advisor_approved_at)
    VALUES($1,'legacy-event',$2,'legacy','Legacy event','Original body',true,'2020-02-01','2020-02-02','public','legacy','2020-01-10')`,
    [IDS.event, IDS.community]
  )
  await pool.query(
    "INSERT INTO public.registration(post_id,user_id,status) VALUES($1,'legacy','attended')",
    [IDS.event]
  )
  await pool.query(
    "INSERT INTO public.community_invite(community_id,email,role) VALUES($1,'future@vit.edu.in','manager')",
    [IDS.community]
  )
  await pool.query(
    "INSERT INTO public.event_host(post_id,user_id) VALUES($1,'legacy')",
    [IDS.event]
  )
  await pool.query(
    "INSERT INTO public.permission_override(user_id,capability,effect) VALUES('legacy','manage_events','grant')"
  )
  await pool.query(
    "INSERT INTO public.audit_log(actor_id,action,target_type,details) VALUES('legacy','historical','post','{\"original\":true}')"
  )
}
