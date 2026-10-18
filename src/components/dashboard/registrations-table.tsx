"use client"

import { useMemo, useState } from "react"
import { SearchIcon } from "lucide-react"
import { ActionForm } from "@/components/action-form"
import { RecordTable } from "@/components/dashboard/record-table"
import { Button } from "@/components/ui/button"
import { EmptyState, StatusBadge } from "@/components/dashboard/ui"
import { SubmitButton } from "@/components/submit-button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { decideRegistrationsAction } from "@/app/dashboard/c/[slug]/posts/actions"

export type RegistrationRow = {
  id: string
  name: string
  email: string
  rollNumber: string | null
  department: string | null
  status: string
  registeredAt: string
}

const FILTERS = [
  "all",
  "pending",
  "approved",
  "attended",
  "rejected",
  "cancelled",
  "no_show",
]

export function RegistrationsTable({
  rows,
  slug,
  postId,
  canDecide,
  canCheckIn,
  initialFilter,
}: {
  rows: RegistrationRow[]
  slug: string
  postId: string
  canDecide: boolean
  canCheckIn: boolean
  initialFilter: string
}) {
  const [filter, setFilter] = useState(
    FILTERS.includes(initialFilter) ? initialFilter : "all"
  )
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length }
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rows])

  const visible = rows.filter((r) => {
    if (filter !== "all" && r.status !== filter) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [r.name, r.email, r.rollNumber ?? ""].some((v) =>
      v.toLowerCase().includes(q)
    )
  })

  const allSelected =
    visible.length > 0 && visible.every((r) => selected.has(r.id))
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const selectable = canDecide || canCheckIn
  const none = selected.size === 0

  return (
    <div className="flex flex-col">
      <div className="flex min-w-0 flex-col gap-3 border-b px-4 py-4 md:px-6">
        <Tabs
          value={filter}
          onValueChange={(v) => {
            setFilter(String(v))
            setSelected(new Set())
          }}
        >
          <TabsList className="h-auto w-full max-w-full flex-wrap justify-start gap-1 group-data-horizontal/tabs:h-auto">
            {FILTERS.map((f) => (
              <TabsTrigger
                key={f}
                value={f}
                className="h-auto min-h-11 flex-none px-2.5 text-xs capitalize md:min-h-8"
              >
                {f === "no_show" ? "No-show" : f}
                <span className="text-muted-foreground tabular-nums">
                  {counts[f] ?? 0}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-sm">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(new Set())
            }}
            placeholder="Name, email, roll no."
            aria-label="Search registrations"
            className="pl-8"
          />
        </div>
      </div>

      {selectable && (
        <ActionForm
          action={decideRegistrationsAction}
          onDone={() => setSelected(new Set())}
          className="bg-muted/40 flex flex-wrap items-center gap-2 border-b px-4 py-3 md:px-6 [&>[role=alert]]:w-full"
        >
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="postId" value={postId} />
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="registrationId" value={id} />
          ))}
          <label className="flex min-h-11 items-center gap-2 pr-2 text-xs">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(on) =>
                setSelected(
                  on ? new Set(visible.map((row) => row.id)) : new Set()
                )
              }
              aria-label="Select all visible registrations"
            />
            Select visible
          </label>
          <span
            aria-live="polite"
            className="text-muted-foreground mr-2 text-sm tabular-nums"
          >
            {selected.size} selected
          </span>
          {canDecide && (
            <>
              <SubmitButton
                name="decision"
                value="approve"
                size="sm"
                disabled={none}
                pendingLabel="Applying…"
              >
                Approve
              </SubmitButton>
              <SubmitButton
                name="decision"
                value="reject"
                size="sm"
                variant="destructive"
                disabled={none}
                pendingLabel="Applying…"
              >
                Reject
              </SubmitButton>
            </>
          )}
          {canCheckIn && (
            <>
              <SubmitButton
                name="decision"
                value="checkin"
                size="sm"
                variant="secondary"
                disabled={none}
                pendingLabel="Applying…"
              >
                Check in
              </SubmitButton>
              <SubmitButton
                name="decision"
                value="noshow"
                size="sm"
                variant="outline"
                disabled={none}
                pendingLabel="Applying…"
              >
                No-show
              </SubmitButton>
              <SubmitButton
                name="decision"
                value="reset"
                size="sm"
                variant="ghost"
                disabled={none}
                pendingLabel="Applying…"
              >
                Undo check-in
              </SubmitButton>
            </>
          )}
        </ActionForm>
      )}

      <p
        className="text-muted-foreground border-b px-4 py-2 text-xs md:px-6"
        aria-live="polite"
      >
        {visible.length} of {rows.length} registrations
        {selected.size > 0
          ? " · Decisions apply to every selected attendee."
          : ""}
      </p>
      {visible.length === 0 ? (
        <EmptyState
          className="m-4"
          title={
            rows.length === 0
              ? "No registrations yet"
              : "No registrations match"
          }
          body={
            rows.length === 0
              ? "Requests will appear here when people register."
              : "Try a different status, name, email or roll number."
          }
          action={
            rows.length > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setFilter("all")
                  setQuery("")
                  setSelected(new Set())
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <RecordTable>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10 pl-6">
                  <span className="sr-only">Selection</span>
                </TableHead>
              )}
              <TableHead className={selectable ? "" : "pl-6"}>Name</TableHead>
              <TableHead>Roll no.</TableHead>
              <TableHead>Dept</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow
                key={r.id}
                data-state={selected.has(r.id) ? "selected" : undefined}
              >
                {selectable && (
                  <TableCell className="pl-6">
                    <label className="flex min-h-11 items-center gap-2 md:min-h-0">
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(on) => toggle(r.id, on)}
                        aria-label={`Select ${r.name}`}
                      />
                      <span className="text-muted-foreground text-xs md:sr-only">
                        Select attendee
                      </span>
                    </label>
                  </TableCell>
                )}
                <TableCell className={selectable ? "" : "pl-6"}>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-muted-foreground text-xs">{r.email}</div>
                </TableCell>
                <TableCell data-label="Roll no." className="tabular-nums">
                  {r.rollNumber ?? "—"}
                </TableCell>
                <TableCell data-label="Department">
                  {r.department ?? "—"}
                </TableCell>
                <TableCell
                  data-label="Registered"
                  className="text-muted-foreground"
                >
                  {r.registeredAt}
                </TableCell>
                <TableCell data-label="Status" className="pr-6">
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </RecordTable>
      )}
    </div>
  )
}
