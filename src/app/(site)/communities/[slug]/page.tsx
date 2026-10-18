import { withDb } from "@/db"
import { getTrustedActor } from "@/lib/session"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { CommunityLogo } from "@/components/community-logo"
import { PageHeader } from "@/components/page-header"
import { PostCard } from "@/components/post-card"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  getActiveCommunityBySlug,
  listActiveCommunities,
} from "@/db/queries/communities"
import { listFeed } from "@/db/queries/posts"
import { getCommunityAccess, getSessionUser } from "@/lib/session"

type Props = { params: Promise<{ slug: string }> }

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const community = await withDb(await getTrustedActor(), async (ctx) =>
    getActiveCommunityBySlug(ctx, (await params).slug)
  )
  return { title: community ? `${community.name} · vboard` : "vboard" }
}

export default async function CommunityPage({ params }: Props) {
  const community = await withDb(await getTrustedActor(), async (ctx) =>
    getActiveCommunityBySlug(ctx, (await params).slug)
  )
  if (!community) notFound()
  const user = await getSessionUser()
  const [posts, all, access] = await Promise.all([
    withDb(await getTrustedActor(), async (ctx) =>
      listFeed(ctx, { communityId: community.id })
    ),
    withDb(await getTrustedActor(), async (ctx) => listActiveCommunities(ctx)),
    user ? getCommunityAccess(user, community.slug) : null,
  ])
  const events = posts.filter((post) => post.isEvent).length
  const teamCount = all.find((item) => item.id === community.id)?.teamCount ?? 0

  return (
    <div className="space-y-6">
      <Link
        href="/communities"
        className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-2 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All communities
      </Link>
      <div className="flex items-start gap-4 border-b pb-7">
        <CommunityLogo name={community.name} logoUrl={community.logoUrl} />
        <PageHeader
          title={community.name}
          description={community.description ?? undefined}
          className="flex-1 [&_h1]:text-3xl md:[&_h1]:text-4xl"
          actions={
            access ? (
              <Link
                href={`/dashboard/c/${community.slug}`}
                className={buttonVariants({ variant: "outline" })}
              >
                Manage community
              </Link>
            ) : undefined
          }
        />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section aria-labelledby="posts-heading" className="min-w-0 space-y-4">
          <h2 id="posts-heading" className="text-sm font-semibold break-words">
            Latest from {community.name}
          </h2>
          {posts.length === 0 ? (
            <EmptyState
              title="No posts yet"
              body="Events and announcements from this community will appear here."
              icon={<MessageSquare />}
            />
          ) : (
            <div className="grid gap-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Community at a glance</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              <div className="flex items-center justify-between gap-3 pb-3">
                <dt className="text-muted-foreground">Team members</dt>
                <dd className="font-medium tabular-nums">{teamCount}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <dt className="text-muted-foreground">Published events</dt>
                <dd className="font-medium tabular-nums">{events}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 pt-3">
                <dt className="text-muted-foreground">Posts in this feed</dt>
                <dd className="font-medium tabular-nums">{posts.length}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
