"use client"

import { useMemo, useState, type CSSProperties } from "react"
import { CalendarDays } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/empty-state"
import { PostCard } from "@/components/post-card"
import type { CalendarEvent } from "@/components/calendar-event"
import {
  calendarDayKey,
  campusCalendarDate,
  campusDayKey,
  formatCalendarHeader,
} from "@/lib/format"

export function EventCalendar({ events }: { events: CalendarEvent[] }) {
  const [selected, setSelected] = useState<Date | undefined>(() =>
    campusCalendarDate(new Date())
  )
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const event of events) {
      if (!event.startsAt) continue
      const key = campusDayKey(event.startsAt)
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [events])
  const eventDays = useMemo(
    () =>
      events
        .map((event) => event.startsAt)
        .filter((date): date is Date => !!date)
        .map(campusCalendarDate),
    [events]
  )
  const selectedEvents = selected
    ? (eventsByDay.get(calendarDayKey(selected)) ?? [])
    : []

  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <Card className="gap-0">
        <CardContent className="px-2">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={setSelected}
            className="mx-auto bg-transparent p-0"
            style={
              {
                "--cell-size": "min(2.75rem, calc((100vw - 3rem) / 7))",
              } as CSSProperties
            }
            modifiers={{ hasEvent: eventDays }}
            modifiersClassNames={{
              hasEvent:
                "font-semibold relative after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:size-1 after:rounded-full after:bg-brand has-[[data-selected-single=true]]:after:bg-primary-foreground",
            }}
          />
        </CardContent>
        <div className="text-muted-foreground mx-4 mt-4 flex items-center justify-between gap-2 border-t pt-4 text-xs">
          <span className="flex items-center gap-2">
            <span className="bg-brand size-1.5 rounded-full" aria-hidden />
            Day with events
          </span>
          <span>IST</span>
        </div>
      </Card>
      <section
        className="min-w-0 space-y-4"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Events on selected day"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
          <h2 className="text-lg font-semibold tracking-tight">
            {selected ? formatCalendarHeader(selected) : "Select a day"}
          </h2>
          <span className="text-muted-foreground text-xs">
            {selectedEvents.length}{" "}
            {selectedEvents.length === 1 ? "event" : "events"}
          </span>
        </div>
        {selected && calendarDayKey(selected) < campusDayKey(new Date()) && (
          <p className="text-muted-foreground text-xs">
            You are viewing a past date.
          </p>
        )}
        {selectedEvents.length > 0 ? (
          <div className="grid gap-4">
            {selectedEvents.map((post) => (
              <PostCard key={post.id} post={post} variant="compact" />
            ))}
          </div>
        ) : (
          <EmptyState
            title={selected ? "No events on this day" : "Choose a date"}
            body={
              events.length === 0
                ? "Community events will appear here when they are published."
                : "Select a marked day in the calendar to see what's scheduled."
            }
            icon={<CalendarDays />}
          />
        )}
      </section>
    </div>
  )
}
