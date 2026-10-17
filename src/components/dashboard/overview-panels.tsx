import Link from "next/link"
import {
  EmptyState,
  Panel,
  RoleBadge,
  StatusBadge,
} from "@/components/dashboard/ui"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatEventDate, formatStamp } from "@/lib/format"
import type { CommunityRole } from "@/lib/rbac"

export type UpcomingEvent = {
  id: string
  title: string | null
  startsAt: Date | null
  capacity: number | null
  status: string
  communitySlug: string
  communityName: string
  seatsTaken: number
  pendingCount: number
}

export type PendingRequest = {
  id: string
  registeredAt: Date
  name: string
  postId: string
  title: string | null
  communitySlug: string
}

export type MyEvent = {
  id: string
  status: string
  postSlug: string
  title: string | null
  startsAt: Date | null
  communityName: string
}

export function TeamEvents({
  events,
  title,
  description,
  empty,
}: {
  events: UpcomingEvent[]
  title: string
  description: string
  empty: string
}) {
  return (
    <Panel title={title} description={description} flush>
      {events.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Event</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead className="pr-6">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="pl-6">
                  <Link
                    href={`/dashboard/c/${event.communitySlug}/posts/${event.id}`}
                    className="font-medium hover:underline"
                  >
                    {event.title}
                  </Link>
                  <div className="text-muted-foreground text-xs">
                    {event.communityName}
                    {event.status === "draft" && " · draft"}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {event.startsAt ? formatEventDate(event.startsAt) : "TBD"}
                </TableCell>
                <TableCell className="tabular-nums">
                  {event.seatsTaken}
                  {event.capacity ? `/${event.capacity}` : ""}
                </TableCell>
                <TableCell className="pr-6">
                  {event.pendingCount > 0 ? (
                    <Badge variant="outline">{event.pendingCount}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}

export function PendingDecisions({ requests }: { requests: PendingRequest[] }) {
  return (
    <Panel
      title="Needs your decision"
      description="Oldest requests first."
      flush
    >
      {requests.length === 0 ? (
        <EmptyState
          title="All caught up"
          body="No registration requests are waiting."
        />
      ) : (
        <Table>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="max-w-0 pl-6">
                  <div className="truncate font-medium">{request.name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {request.title} · {formatStamp(request.registeredAt)}
                  </div>
                </TableCell>
                <TableCell className="w-0 pr-6 text-right">
                  <Link
                    href={`/dashboard/c/${request.communitySlug}/posts/${request.postId}?status=pending`}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Review
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}

export function MyEvents({ events }: { events: MyEvent[] }) {
  return (
    <Panel
      title="Your next events"
      flush
      action={
        <Link
          href="/dashboard/registrations"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          All registrations
        </Link>
      }
    >
      {events.length === 0 ? (
        <EmptyState
          title="You are not registered for anything yet"
          action={
            <Link href="/" className={buttonVariants({ size: "sm" })}>
              Discover events
            </Link>
          }
        />
      ) : (
        <Table>
          <TableBody>
            {events.slice(0, 5).map((event) => (
              <TableRow key={event.id}>
                <TableCell className="pl-6">
                  <Link
                    href={`/posts/${event.postSlug}`}
                    className="font-medium hover:underline"
                  >
                    {event.title}
                  </Link>
                  <div className="text-muted-foreground text-xs">
                    {event.communityName}
                    {event.startsAt
                      ? ` · ${formatEventDate(event.startsAt)}`
                      : ""}
                  </div>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <StatusBadge status={event.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  )
}

export function CommunityList({
  memberships,
}: {
  memberships: {
    slug: string
    name: string
    role: CommunityRole
  }[]
}) {
  return (
    <Panel
      title="Your communities"
      description="Open the one you are working in."
    >
      <ul className="divide-y">
        {memberships.map((membership) => (
          <li
            key={membership.slug}
            className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/c/${membership.slug}`}
                className="font-medium hover:underline"
              >
                {membership.name}
              </Link>
              <RoleBadge role={membership.role} />
            </div>
            <div className="flex gap-2">
              {membership.role === "lead" && (
                <Link
                  href={`/dashboard/c/${membership.slug}/team`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Team
                </Link>
              )}
              {(membership.role === "lead" ||
                membership.role === "manager") && (
                <Link
                  href={`/dashboard/c/${membership.slug}/posts/new`}
                  className={buttonVariants({ size: "sm" })}
                >
                  New post
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
