import Link from "next/link"
import { EventFilters } from "@/components/dashboard/event-filters"
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listActiveCommunities } from "@/db/queries/communities"
import {
  listDashboardEvents,
  type DashboardEventStatus,
  type DashboardEventWhen,
} from "@/db/queries/posts"
import { formatEventDate } from "@/lib/format"
import { communityCan, isSiteAdmin } from "@/lib/rbac"
import { requireUser } from "@/lib/session"

const WHEN: DashboardEventWhen[] = ["all", "upcoming", "past"]
const STATUS: DashboardEventStatus[] = [
  "all",
  "published",
  "draft",
  "cancelled",
  "completed",
  "hidden",
]

function oneOf<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.find((item) => item === value) ?? fallback
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    when?: string
    status?: string
    community?: string
  }>
}) {
  const user = await requireUser()
  const params = await searchParams
  const q = params.q ?? ""
  const when = oneOf(params.when, WHEN, "all")
  const status = oneOf(params.status, STATUS, "all")
  const communitySlug =
    params.community && params.community !== "all" ? params.community : null
  const seeAll = isSiteAdmin(user.siteRole)
  const readableCommunityIds = seeAll
    ? []
    : user.memberships
        .filter((m) => communityCan(user.siteRole, m.role, "post:read"))
        .map((m) => m.communityId)
  const canSeePrivate = seeAll || readableCommunityIds.length > 0

  const [events, communities] = await Promise.all([
    listDashboardEvents({
      seeAll,
      readableCommunityIds,
      q,
      communitySlug,
      when,
      status,
      now: new Date(),
    }),
    listActiveCommunities(),
  ])

  const statuses = [
    { value: "all", label: "Any status" },
    { value: "published", label: "Published" },
    ...(canSeePrivate
      ? [
          { value: "draft", label: "Draft" },
          { value: "cancelled", label: "Cancelled" },
          { value: "completed", label: "Completed" },
          { value: "hidden", label: "Hidden" },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="All events"
        description={
          canSeePrivate
            ? "Every event on active communities. Drafts and other unpublished states are limited to communities you can manage."
            : "Every published event on vboard."
        }
      />
      <Panel
        flush
        title={`${events.length}${events.length === 200 ? "+" : ""} event${events.length === 1 ? "" : "s"}`}
        action={
          <EventFilters
            q={q}
            when={when}
            status={
              statuses.some((item) => item.value === status) ? status : "all"
            }
            community={communitySlug ?? "all"}
            communities={communities.map((c) => ({
              value: c.slug,
              label: c.name,
            }))}
            statuses={statuses}
          />
        }
      >
        {events.length === 0 ? (
          <EmptyState
            title="No events match"
            body="Try another time, community, or status."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Event</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => {
                const manageable =
                  seeAll || readableCommunityIds.includes(event.communityId)
                return (
                  <TableRow key={event.id}>
                    <TableCell className="pl-6">
                      <Link
                        href={
                          manageable
                            ? `/dashboard/c/${event.communitySlug}/posts/${event.id}`
                            : `/posts/${event.slug}`
                        }
                        className="font-medium hover:underline"
                      >
                        {event.title}
                      </Link>
                      <div className="text-muted-foreground text-xs">
                        {event.communityName}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.startsAt
                        ? formatEventDate(
                            event.startsAt,
                            event.endsAt ?? undefined
                          )
                        : "TBD"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {event.seatsTaken}
                      {event.capacity ? `/${event.capacity}` : ""}
                    </TableCell>
                    <TableCell className="pr-6">
                      <StatusBadge status={event.status} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  )
}
