import { withDb } from "@/db"
import { RecordTable } from "@/components/dashboard/record-table"
import Link from "next/link"
import { PinIcon } from "lucide-react"
import {
  EmptyState,
  Panel,
  SectionCards,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/ui"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listCommunityPosts } from "@/db/queries/posts"
import { formatEventDate, formatStamp } from "@/lib/format"
import { requireCommunityAccess } from "@/lib/session"

export default async function CommunityPostsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const access = await requireCommunityAccess(slug)
  const posts = await withDb({ userId: access.user.id }, async (ctx) =>
    listCommunityPosts(ctx, access.community.id)
  )

  const now = new Date()
  const upcoming = posts.filter(
    (p) =>
      p.isEvent && p.status === "published" && p.startsAt && p.startsAt >= now
  ).length
  const pending = posts.reduce((sum, p) => sum + p.pendingCount, 0)
  const seats = posts.reduce((sum, p) => sum + p.seatsTaken, 0)
  const drafts = posts.filter((p) => p.status === "draft").length

  return (
    <>
      <SectionCards>
        <StatCard
          label="Posts"
          value={posts.length}
          footer={`${drafts} draft${drafts === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Upcoming events"
          value={upcoming}
          footer="Published, not yet started"
        />
        <StatCard
          label="Confirmed seats"
          value={seats}
          footer="Approved and checked in"
        />
        <StatCard
          label="Pending requests"
          value={pending}
          badge={
            pending > 0 ? (
              <Badge variant="outline">Needs review</Badge>
            ) : undefined
          }
          footer="Across approval events"
        />
      </SectionCards>

      <Panel title="Posts and events" flush>
        {posts.length === 0 ? (
          <EmptyState
            className="m-4"
            title="Nothing posted yet"
            body="Announcements and events you create appear here."
            action={
              access.can("post:write") ? (
                <Link
                  href={`/dashboard/c/${slug}/posts/new`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Create the first post
                </Link>
              ) : undefined
            }
          />
        ) : (
          <RecordTable>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="pr-6">Registrations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-6">
                    <Link
                      href={`/dashboard/c/${slug}/posts/${p.id}`}
                      className="inline-flex items-center gap-2 font-medium hover:underline"
                    >
                      {p.title}
                      {p.isPinned && (
                        <PinIcon
                          className="text-muted-foreground size-3.5"
                          aria-label="Pinned"
                        />
                      )}
                    </Link>
                  </TableCell>
                  <TableCell data-label="Type">
                    <Badge variant="outline">
                      {p.isEvent ? "Event" : "Note"}
                    </Badge>
                  </TableCell>
                  <TableCell data-label="Status">
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell
                    data-label="When"
                    className="text-muted-foreground"
                  >
                    {p.isEvent && p.startsAt
                      ? formatEventDate(p.startsAt)
                      : formatStamp(p.createdAt)}
                  </TableCell>
                  <TableCell data-label="Registrations" className="pr-6">
                    {p.isEvent ? (
                      <span className="inline-flex items-center gap-2 tabular-nums">
                        {p.seatsTaken}
                        {p.capacity ? `/${p.capacity}` : ""}
                        {p.pendingCount > 0 && (
                          <Badge variant="outline">
                            {p.pendingCount} pending
                          </Badge>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </RecordTable>
        )}
      </Panel>
    </>
  )
}
