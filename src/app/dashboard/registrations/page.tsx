import { RecordTable } from "@/components/dashboard/record-table"
import Link from "next/link"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { FormSelect } from "@/components/form-select"
import { ActionForm } from "@/components/action-form"
import { ConfirmSubmit } from "@/components/confirm-submit"
import {
  EmptyState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cancelRegistrationAction } from "@/app/(site)/posts/[slug]/actions"
import { listUserRegistrations } from "@/db/queries/registrations"
import { formatEventDate } from "@/lib/format"
import { requireUser } from "@/lib/session"

export default async function MyRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const user = await requireUser()
  const registrations = await listUserRegistrations(user.id)
  const { q, status } = z
    .object({
      q: z.string().max(200).catch(""),
      status: z
        .enum([
          "all",
          "pending",
          "approved",
          "attended",
          "rejected",
          "cancelled",
          "no_show",
        ])
        .catch("all"),
    })
    .parse(await searchParams)
  const filtered = Boolean(q || status !== "all")
  const rows = registrations.filter(
    (row) =>
      (status === "all" || row.status === status) &&
      `${row.title} ${row.communityName}`
        .toLowerCase()
        .includes(q.trim().toLowerCase())
  )
  const now = new Date()

  return (
    <>
      <PageHeader
        title="My registrations"
        description="Pending requests, confirmed seats, and your history. Cancel a seat so someone else can take it."
      />
      <Panel
        flush
        title={`${rows.length} registration${rows.length === 1 ? "" : "s"}`}
      >
        <form className="grid min-w-0 gap-2 border-b p-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] md:px-6">
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search your events"
            aria-label="Search your registrations"
          />
          <FormSelect
            name="status"
            label="Registration status"
            defaultValue={status}
            className="w-full"
            items={[
              { value: "all", label: "All statuses" },
              ...[
                "pending",
                "approved",
                "attended",
                "rejected",
                "cancelled",
                "no_show",
              ].map((value) => ({
                value,
                label:
                  value === "no_show"
                    ? "No-show"
                    : value.charAt(0).toUpperCase() + value.slice(1),
              })),
            ]}
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
          {filtered && (
            <Link
              href="/dashboard/registrations"
              className="text-muted-foreground text-xs underline underline-offset-4 sm:col-span-full"
            >
              Clear filters
            </Link>
          )}
        </form>
        {rows.length === 0 ? (
          <EmptyState
            title={filtered ? "No registrations match" : "No registrations yet"}
            body={
              filtered
                ? "Try another event name or registration status."
                : "Your event requests and confirmed seats will appear here."
            }
            className="m-4"
            action={
              <Link
                href={filtered ? "/dashboard/registrations" : "/"}
                className={buttonVariants({ size: "sm" })}
              >
                {filtered ? "Clear filters" : "Discover events"}
              </Link>
            }
          />
        ) : (
          <RecordTable>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Event</TableHead>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const upcoming = r.startsAt && (r.endsAt ?? r.startsAt) >= now
                const cancellable =
                  upcoming &&
                  (r.status === "pending" || r.status === "approved")
                return (
                  <TableRow key={r.id}>
                    <TableCell className="pl-6">
                      <Link
                        href={`/posts/${r.postSlug}`}
                        className="font-medium hover:underline"
                      >
                        {r.title}
                      </Link>
                      <div className="text-muted-foreground text-xs">
                        {r.communityName}
                        {r.postStatus === "cancelled" && " · event cancelled"}
                      </div>
                    </TableCell>
                    <TableCell
                      data-label="When"
                      className="text-muted-foreground"
                    >
                      {r.startsAt ? formatEventDate(r.startsAt) : "TBD"}
                    </TableCell>
                    <TableCell data-label="Status">
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell data-label="Action" className="pr-6 text-right">
                      {cancellable && (
                        <ActionForm
                          action={cancelRegistrationAction}
                          className="inline"
                        >
                          <input type="hidden" name="postId" value={r.postId} />
                          <ConfirmSubmit
                            label="Cancel"
                            title="Cancel this registration?"
                            description={`You will lose your place at ${r.title}.`}
                            confirmLabel="Cancel registration"
                          />
                        </ActionForm>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </RecordTable>
        )}
      </Panel>
    </>
  )
}
