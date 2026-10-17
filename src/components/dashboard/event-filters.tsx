"use client"

import { useRef } from "react"
import { FormSelect } from "@/components/form-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function EventFilters({
  q,
  when,
  status,
  community,
  communities,
  statuses,
}: {
  q: string
  when: string
  status: string
  community: string
  communities: { value: string; label: string }[]
  statuses: { value: string; label: string }[]
}) {
  const form = useRef<HTMLFormElement>(null)
  const submit = () => {
    setTimeout(() => form.current?.requestSubmit(), 0)
  }

  return (
    <form ref={form} method="get" className="flex flex-wrap items-center gap-2">
      <Input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search events"
        aria-label="Search events"
        className="w-48"
      />
      <FormSelect
        name="when"
        defaultValue={when}
        items={[
          { value: "all", label: "Any time" },
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
        ]}
        label="When"
        size="sm"
        className="w-32"
        onValueChange={submit}
      />
      <FormSelect
        name="community"
        defaultValue={community}
        items={[{ value: "all", label: "All communities" }, ...communities]}
        label="Community"
        size="sm"
        className="w-44"
        onValueChange={submit}
      />
      <FormSelect
        name="status"
        defaultValue={status}
        items={statuses}
        label="Status"
        size="sm"
        className="w-32"
        onValueChange={submit}
      />
      <Button type="submit" variant="outline" size="sm">
        Search
      </Button>
    </form>
  )
}
