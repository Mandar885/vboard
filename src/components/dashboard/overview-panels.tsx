import Link from "next/link"
import { ArrowUpRightIcon, CalendarIcon } from "lucide-react"
import {
  EmptyState,
  Panel,
  RoleBadge,
  StatusBadge,
} from "@/components/dashboard/ui"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
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
    <Panel
      title={title}
      description={description}
      flush
      action={
        <Link
          href="/dashboard/events"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          All events
          <ArrowUpRightIcon />
        </Link>
      }
    >
      {events.length === 0 ? (
        <EmptyState title={empty} className="m-4" icon={<CalendarIcon />} />
      ) : (
        <ul className="divide-y">
          {events.slice(0, 6).map((event) => (
            <li key={event.id}>
              <Link
                href={`/dashboard/c/${event.communitySlug}/posts/${event.id}`}
                className="hover:bg-muted/50 flex min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium break-words">{event.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {event.communityName} ·{" "}
                    {event.startsAt
                      ? formatEventDate(event.startsAt)
                      : "Date to be confirmed"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {event.status !== "published" && (
                    <StatusBadge status={event.status} />
                  )}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {event.seatsTaken}
                    {event.capacity ? ` / ${event.capacity}` : ""} seats
                  </span>
                  {event.pendingCount > 0 && (
                    <Badge variant="outline">
                      {event.pendingCount} pending
                    </Badge>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function PendingDecisions({ requests }: { requests: PendingRequest[] }) {
  return (
    <Panel
      title="Needs attention"
      description={`${requests.length}${requests.length === 20 ? "+" : ""} pending registration${requests.length === 1 ? "" : "s"} · oldest first`}
      flush
    >
      {requests.length === 0 ? (
        <EmptyState
          title="All caught up"
          body="No registration requests are waiting."
          className="m-4"
        />
      ) : (
        <>
          <ul className="divide-y">
            {requests.slice(0, 5).map((request) => (
              <li
                key={request.id}
                className="flex items-start justify-between gap-3 px-4 py-4 md:px-6"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium break-words">{request.name}</p>
                  <p className="text-muted-foreground text-xs break-words">
                    {request.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatStamp(request.registeredAt)}
                  </p>
                </div>
                <Link
                  href={`/dashboard/c/${request.communitySlug}/posts/${request.postId}?status=pending`}
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "min-h-11 shrink-0",
                  })}
                >
                  Review
                </Link>
              </li>
            ))}
          </ul>
          {requests.length > 5 && (
            <div className="text-muted-foreground border-t px-4 py-3 text-xs md:px-6">
              Showing 5 of {requests.length}
              {requests.length === 20 ? "+" : ""} requests.{" "}
              <Link
                href="/dashboard/events"
                className="text-foreground underline underline-offset-4"
              >
                Open an event
              </Link>{" "}
              to review its full queue.
            </div>
          )}
        </>
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
          <ArrowUpRightIcon />
        </Link>
      }
    >
      {events.length === 0 ? (
        <EmptyState
          title="Your next event starts here"
          body="Find something on the campus board and register with your VOSS account."
          className="m-4"
          icon={<CalendarIcon />}
          action={
            <Link href="/" className={buttonVariants({ size: "sm" })}>
              Discover events
            </Link>
          }
        />
      ) : (
        <ul className="divide-y">
          {events.slice(0, 5).map((event) => (
            <li key={event.id}>
              <Link
                href={`/posts/${event.postSlug}`}
                className="hover:bg-muted/50 flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium break-words">{event.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {event.communityName}
                    {event.startsAt
                      ? ` · ${formatEventDate(event.startsAt)}`
                      : ""}
                  </p>
                </div>
                <div>
                  <StatusBadge status={event.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function CommunityList({
  memberships,
}: {
  memberships: { slug: string; name: string; role: CommunityRole }[]
}) {
  return (
    <Panel
      title="Your communities"
      description="Choose a community to continue your work."
    >
      <ul className="divide-y">
        {memberships.map((membership) => (
          <li
            key={membership.slug}
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                href={`/dashboard/c/${membership.slug}`}
                className="font-medium hover:underline"
              >
                {membership.name}
              </Link>
              <RoleBadge role={membership.role} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/dashboard/c/${membership.slug}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Open workspace
              </Link>
              {membership.role === "lead" && (
                <Link
                  href={`/dashboard/c/${membership.slug}/team`}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Team
                </Link>
              )}
              {(membership.role === "lead" ||
                membership.role === "manager") && (
                <Link
                  href={`/dashboard/c/${membership.slug}/posts/new`}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
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
