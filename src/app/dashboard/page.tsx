import { AdminHome, OrganizerHome, StudentHome } from "@/app/dashboard/views"
import { withDb } from "@/db"
import { listAllCommunities } from "@/db/queries/communities"
import {
  countPublishedPosts,
  listUpcomingEventsForCommunities,
} from "@/db/queries/posts"
import { countUsers } from "@/db/queries/profiles"
import {
  countRegistrations,
  listPendingForCommunities,
  listUserRegistrations,
} from "@/db/queries/registrations"
import { homeRole } from "@/lib/home-role"
import { requireUser } from "@/lib/session"
export default async function OverviewPage() {
  const user = await requireUser()
  const role = homeRole(user)
  const data = await withDb({ userId: user.id }, async (ctx) => {
    const now = new Date()
    const mine = (await listUserRegistrations(ctx, user.id))
      .filter(
        (event) =>
          (event.status === "pending" || event.status === "approved") &&
          event.endsAt &&
          event.endsAt >= now
      )
      .map((event) => ({
        id: event.id,
        status: event.status,
        postSlug: event.postSlug,
        title: event.title,
        startsAt: event.startsAt,
        communityName: event.communityName,
      }))
    if (role === "super_admin") {
      const communities = await listAllCommunities(ctx)
      const ids = communities
        .filter((community) => community.isActive)
        .map((community) => community.id)
      return {
        mine,
        platform: {
          users: await countUsers(ctx),
          posts: (await countPublishedPosts(ctx)).posts,
          registrations: await countRegistrations(ctx),
          requests: await listPendingForCommunities(ctx, ids),
          events: await listUpcomingEventsForCommunities(ctx, ids),
          communities: ids.length,
        },
      }
    }
    const ids = user.memberships.map((membership) => membership.communityId)
    return {
      mine,
      events: ids.length
        ? await listUpcomingEventsForCommunities(ctx, ids)
        : [],
      requests: ids.length ? await listPendingForCommunities(ctx, ids) : [],
    }
  })
  if (data.platform) return <AdminHome name={user.name} {...data.platform} />
  if (role === "student")
    return <StudentHome name={user.name} events={data.mine} />
  return (
    <OrganizerHome
      name={user.name}
      lead={role === "lead"}
      memberships={user.memberships}
      events={data.events ?? []}
      requests={data.requests ?? []}
      mine={data.mine}
    />
  )
}
