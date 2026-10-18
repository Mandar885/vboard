import { withDb } from "@/db"
import { getTrustedActor } from "@/lib/session"
import type { Metadata } from "next"
import { EventCalendar } from "@/components/event-calendar"
import { toCalendarEvent } from "@/components/calendar-event"
import { PageHeader } from "@/components/page-header"
import { listEvents } from "@/db/queries/posts"

export const metadata: Metadata = { title: "Calendar · vboard" }
export const dynamic = "force-dynamic"

export default async function CalendarPage() {
  const events = await withDb(await getTrustedActor(), async (ctx) =>
    listEvents(ctx)
  )
  return (
    <div className="space-y-8">
      <PageHeader
        title="Campus calendar"
        description="Find a day, make a plan. Select a marked date to see community events. All times are in IST."
        className="[&_h1]:text-3xl md:[&_h1]:text-4xl"
      />
      <EventCalendar events={events.map(toCalendarEvent)} />
    </div>
  )
}
