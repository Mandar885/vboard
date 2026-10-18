"use client"

import { useRef } from "react"
import Link from "next/link"
import { FormSelect } from "@/components/form-select"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
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
  const submit = () => setTimeout(() => form.current?.requestSubmit(), 0)
  const filtered = Boolean(
    q || when !== "all" || status !== "all" || community !== "all"
  )
  return (
    <form
      ref={form}
      method="get"
      className="grid w-full min-w-0 gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap"
    >
      <Input
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Search events"
        aria-label="Search events"
        className="min-w-0 xl:w-52"
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
        className="w-full min-w-0 xl:w-36"
        onValueChange={submit}
      />
      <FormSelect
        name="community"
        defaultValue={community}
        items={[{ value: "all", label: "All communities" }, ...communities]}
        label="Community"
        className="w-full min-w-0 xl:w-48"
        onValueChange={submit}
      />
      <FormSelect
        name="status"
        defaultValue={status}
        items={statuses}
        label="Status"
        className="w-full min-w-0 xl:w-36"
        onValueChange={submit}
      />
      <Button type="submit" variant="outline">
        Search
      </Button>
      {filtered && (
        <Link
          href="/dashboard/events"
          className={buttonVariants({ variant: "ghost" })}
        >
          Clear filters
        </Link>
      )}
    </form>
  )
}
