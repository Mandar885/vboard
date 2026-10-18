import Link from "next/link"
import { ArrowRight, CalendarDays, Compass } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { PostCard } from "@/components/post-card"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { listActiveCommunities } from "@/db/queries/communities"
import { listFeed } from "@/db/queries/posts"
import { getSessionUser } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const user = await getSessionUser()
  const [posts, communities] = await Promise.all([
    listFeed({ signedIn: !!user }),
    listActiveCommunities(),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Discover campus"
        description="Events, announcements and the communities behind them. One VIT account to join in."
        className="[&_h1]:text-3xl md:[&_h1]:text-4xl"
        actions={
          <Link
            href="/calendar"
            className={buttonVariants({ variant: "outline" })}
          >
            <CalendarDays aria-hidden />
            View calendar
          </Link>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="feed-heading" className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b pb-3">
            <h2 id="feed-heading" className="text-sm font-semibold">
              Latest across vboard
            </h2>
            <span className="text-muted-foreground text-xs">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </span>
          </div>
          {posts.length === 0 ? (
            <EmptyState
              title="The campus feed is quiet"
              body="New events and announcements will appear here when communities post them."
              icon={<Compass />}
              action={
                <Link
                  href="/communities"
                  className={buttonVariants({ variant: "outline" })}
                >
                  Explore communities
                </Link>
              }
            />
          ) : (
            <div className="grid gap-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
          {!user && (
            <p className="text-muted-foreground text-xs leading-relaxed">
              Some posts are for VIT students only.{" "}
              <Link
                href="/login"
                className="text-foreground font-medium underline underline-offset-4"
              >
                Sign in
              </Link>{" "}
              to see them and register for events.
            </p>
          )}
        </section>
        <aside className="space-y-5 lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle>Find your community</CardTitle>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Meet the clubs and societies making things happen at VIT.
              </p>
            </CardHeader>
            <CardContent className="space-y-1">
              {communities.slice(0, 6).map((community) => (
                <Link
                  key={community.id}
                  href={`/communities/${community.slug}`}
                  className="hover:bg-muted -mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 py-2"
                >
                  <span
                    className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
                    aria-hidden
                  >
                    {community.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium break-words">
                      {community.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {community.eventCount}{" "}
                      {community.eventCount === 1 ? "event" : "events"}
                    </span>
                  </span>
                  <ArrowRight
                    className="text-muted-foreground size-3.5 shrink-0"
                    aria-hidden
                  />
                </Link>
              ))}
              {communities.length === 0 && (
                <p className="text-muted-foreground py-2 text-sm">
                  Communities will appear here when they join vboard.
                </p>
              )}
              <Link
                href="/communities"
                className="text-muted-foreground hover:text-foreground mt-3 flex min-h-11 items-center justify-between border-t pt-3 text-xs font-medium"
              >
                All communities
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </CardContent>
          </Card>
          {!user && (
            <div className="space-y-3 px-1">
              <h2 className="text-sm font-medium">
                Your next event starts here
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Sign in with VOSS to register and keep track of your requests in
                one place.
              </p>
              <Link
                href="/login"
                className={buttonVariants({ className: "w-full" })}
              >
                Sign in with VOSS
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
