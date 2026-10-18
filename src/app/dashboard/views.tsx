import Link from "next/link"
import {
  CommunityList,
  MyEvents,
  PendingDecisions,
  TeamEvents,
  type MyEvent,
  type PendingRequest,
  type UpcomingEvent,
} from "@/components/dashboard/overview-panels"
import { PageHeader, SectionCards, StatCard } from "@/components/dashboard/ui"
import { buttonVariants } from "@/components/ui/button-variants"
import type { CommunityRole } from "@/lib/rbac"

type Membership = { slug: string; name: string; role: CommunityRole }

export function StudentHome({ events }: { name: string; events: MyEvent[] }) {
  const going = events.filter((event) => event.status === "approved")
  const waiting = events.filter((event) => event.status === "pending")
  return (
    <>
      <PageHeader
        title="Your workspace"
        description="Keep track of your upcoming events and registration decisions."
        actions={
          <Link href="/" className={buttonVariants()}>
            Discover events
          </Link>
        }
      />
      <SectionCards>
        <StatCard label="Going" value={going.length} hint="Approved seats" />
        <StatCard
          label="Waiting"
          value={waiting.length}
          hint="Awaiting a decision"
        />
        <StatCard
          label="Upcoming"
          value={events.length}
          hint="Active registrations"
        />
      </SectionCards>
      <MyEvents events={events} />
    </>
  )
}

export function VolunteerHome({
  memberships,
  events,
  mine,
}: {
  name: string
  memberships: Membership[]
  events: UpcomingEvent[]
  mine: MyEvent[]
}) {
  return (
    <>
      <PageHeader
        title="Event operations"
        description="Check people in from an event, and see who has registered."
      />
      <SectionCards>
        <StatCard label="Communities" value={memberships.length} />
        <StatCard
          label="Coming up"
          value={`${events.length}${events.length === 10 ? "+" : ""}`}
          hint="Events you staff"
        />
        <StatCard
          label="Your seats"
          value={mine.length}
          hint="Events you joined"
        />
      </SectionCards>
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <TeamEvents
            events={events}
            title="Events to staff"
            description="Open an event to check people in."
            empty="Nothing coming up in your communities."
          />
        </div>
        <div className="xl:col-span-2">
          <CommunityList memberships={memberships} />
        </div>
      </div>
      <MyEvents events={mine} />
    </>
  )
}

export function AdvisorHome({
  memberships,
  events,
}: {
  name: string
  memberships: Membership[]
  events: UpcomingEvent[]
}) {
  return (
    <>
      <PageHeader
        title="Community overview"
        description="The communities you advise, and the events they have coming up."
      />
      <SectionCards>
        <StatCard label="Communities" value={memberships.length} />
        <StatCard
          label="Coming up"
          value={`${events.length}${events.length === 10 ? "+" : ""}`}
        />
      </SectionCards>
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <TeamEvents
            events={events}
            title="Events in your communities"
            description="Open one to read registrations."
            empty="Nothing coming up."
          />
        </div>
        <div className="xl:col-span-2">
          <CommunityList memberships={memberships} />
        </div>
      </div>
    </>
  )
}

export function OrganizerHome({
  lead,
  memberships,
  events,
  requests,
  mine,
}: {
  name: string
  lead: boolean
  memberships: Membership[]
  events: UpcomingEvent[]
  requests: PendingRequest[]
  mine: MyEvent[]
}) {
  return (
    <>
      <PageHeader
        title="Community workspace"
        description={
          lead
            ? "The communities you lead, the events coming up, and the requests waiting on you."
            : "Events you can publish, and registration requests waiting on you."
        }
      />
      <SectionCards>
        <StatCard label="Communities" value={memberships.length} />
        <StatCard
          label="Needs a decision"
          value={`${requests.length}${requests.length === 20 ? "+" : ""}`}
          hint="Pending registrations"
        />
        <StatCard
          label="Coming up"
          value={`${events.length}${events.length === 10 ? "+" : ""}`}
        />
        <StatCard label="Your seats" value={mine.length} />
      </SectionCards>
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="flex flex-col gap-4 xl:col-span-3">
          <TeamEvents
            events={events}
            title="Upcoming events you run"
            description="Drafts included. Open one to manage registrations."
            empty="No upcoming events. Create one from a community."
          />
          <PendingDecisions requests={requests} />
        </div>
        <div className="xl:col-span-2">
          <CommunityList memberships={memberships} />
        </div>
      </div>
      <MyEvents events={mine} />
    </>
  )
}

export function AdminHome({
  superAdmin,
  communities,
  users,
  posts,
  registrations,
  requests,
  events,
}: {
  name: string
  superAdmin: boolean
  communities: number
  users: number
  posts: number
  registrations: number
  requests: PendingRequest[]
  events: UpcomingEvent[]
}) {
  return (
    <>
      <PageHeader
        title="Campus overview"
        description={
          superAdmin
            ? "Every community, and the requests waiting on a decision. You appoint site admins from People."
            : "Every community, and the requests waiting on a decision."
        }
        actions={
          <Link
            href="/dashboard/admin/communities"
            className={buttonVariants()}
          >
            Manage communities
          </Link>
        }
      />
      <SectionCards>
        <StatCard label="Communities" value={communities} />
        <StatCard label="People" value={users} />
        <StatCard label="Published posts" value={posts} />
        <StatCard label="Registrations" value={registrations} />
      </SectionCards>
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <TeamEvents
            events={events}
            title="Coming up on campus"
            description="The next events, across every community."
            empty="No upcoming events."
          />
        </div>
        <div className="xl:col-span-2">
          <PendingDecisions requests={requests} />
        </div>
      </div>
    </>
  )
}
