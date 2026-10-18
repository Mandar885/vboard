import { withDb } from "@/db"
import { getTrustedActor } from "@/lib/session"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Users } from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { listActiveCommunities } from "@/db/queries/communities"

export const metadata: Metadata = { title: "Communities · vboard" }
export const dynamic = "force-dynamic"

export default async function CommunitiesPage() {
  const communities = await withDb(await getTrustedActor(), async (ctx) =>
    listActiveCommunities(ctx)
  )
  return (
    <div className="space-y-8">
      <PageHeader
        title="Find your people"
        description="Explore the clubs and societies at VIT, and see what they're putting together next."
        className="[&_h1]:text-3xl md:[&_h1]:text-4xl"
      />
      <section aria-label="Communities" className="space-y-4">
        <div className="text-muted-foreground border-b pb-3 text-xs">
          {communities.length}{" "}
          {communities.length === 1 ? "community" : "communities"} on vboard
        </div>
        {communities.length === 0 ? (
          <EmptyState
            title="Communities are on their way"
            body="Clubs and societies will appear here when they join vboard."
            icon={<Users />}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <Link
                key={community.id}
                href={`/communities/${community.slug}`}
                className="group block rounded-xl"
              >
                <Card className="group-hover:ring-foreground/25 h-full gap-0 transition-shadow">
                  <CardContent className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className="bg-muted flex size-11 items-center justify-center rounded-lg text-lg font-semibold"
                        aria-hidden
                      >
                        {community.name.charAt(0)}
                      </span>
                      <ArrowRight
                        className="text-muted-foreground mt-1 size-4"
                        aria-hidden
                      />
                    </div>
                    <h2 className="group-hover:text-brand mt-4 text-lg font-semibold tracking-tight break-words">
                      {community.name}
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed break-words">
                      {community.description}
                    </p>
                  </CardContent>
                  <CardFooter className="text-muted-foreground mt-5 flex flex-wrap justify-between gap-2 py-3 text-xs">
                    <span>
                      {community.eventCount}{" "}
                      {community.eventCount === 1 ? "event" : "events"}
                    </span>
                    <span>{community.teamCount} on the team</span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
