import {
  AdminHome,
  AdvisorHome,
  OrganizerHome,
  StudentHome,
  VolunteerHome,
} from "@/app/dashboard/views"
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
import { communityCan } from "@/lib/rbac"
import { requireUser } from "@/lib/session"

export default async function OverviewPage() {
  const user = await requireUser()
  const role = homeRole(user)
  const now = new Date()
  const mine = (await listUserRegistrations(user.id))
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

  if (role === "student") {
    return <StudentHome name={user.name} events={mine} />
  }

  if (role === "admin" || role === "super_admin") {
    const communities = await listAllCommunities()
    const activeIds = communities
      .filter((community) => community.isActive)
      .map((community) => community.id)
    const [users, published, registrations, requests, events] =
      await Promise.all([
        countUsers(),
        countPublishedPosts(),
        countRegistrations(),
        listPendingForCommunities(activeIds),
        listUpcomingEventsForCommunities(activeIds),
      ])
    return (
      <AdminHome
        name={user.name}
        superAdmin={role === "super_admin"}
        communities={activeIds.length}
        users={users}
        posts={published.posts}
        registrations={registrations}
        requests={requests}
        events={events}
      />
    )
  }

  const memberships = user.memberships.map((membership) => ({
    slug: membership.slug,
    name: membership.name,
    role: membership.role,
  }))
  const communityIds = user.memberships.map(
    (membership) => membership.communityId
  )
  const events = await listUpcomingEventsForCommunities(communityIds)

  if (role === "volunteer") {
    return (
      <VolunteerHome
        name={user.name}
        memberships={memberships}
        events={events}
        mine={mine}
      />
    )
  }

  if (role === "advisor") {
    return (
      <AdvisorHome name={user.name} memberships={memberships} events={events} />
    )
  }

  const deciderIds = user.memberships
    .filter((membership) =>
      communityCan(user.siteRole, membership.role, "registration:decide")
    )
    .map((membership) => membership.communityId)
  const requests = await listPendingForCommunities(deciderIds)
  return (
    <OrganizerHome
      name={user.name}
      lead={role === "lead"}
      memberships={memberships}
      events={events}
      requests={requests}
      mine={mine}
    />
  )
}
