import { withDb } from "@/db"
import { RecordTable } from "@/components/dashboard/record-table"
import { SearchIcon } from "lucide-react"
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listPeople } from "@/db/queries/profiles"
import { SITE_ROLE_LABEL } from "@/lib/rbac"
import { requireSiteCapability } from "@/lib/session"

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await requireSiteCapability("user:read")
  const { q = "" } = await searchParams
  const people = await withDb({ userId: user.id }, async (ctx) =>
    listPeople(ctx, q)
  )

  return (
    <>
      <PageHeader
        title="People"
        description="Everyone who has signed in. Community roles are managed from each community team."
      />
      <Panel
        title={q ? `Results for "${q}"` : "Everyone"}
        description={`${people.length}${people.length === 50 ? "+" : ""} ${people.length === 1 ? "person" : "people"}`}
        flush
      >
        <div className="border-b p-4 md:px-6">
          <form className="flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1 sm:max-w-sm">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Name, email, roll no."
                aria-label="Search people"
                className="w-full pl-8"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </div>
        {people.length === 0 ? (
          <EmptyState
            className="m-4"
            title={q ? "No people match" : "No people yet"}
            body={
              q
                ? "Try a different name, email or roll number."
                : "Accounts appear here after their first sign-in."
            }
          />
        ) : (
          <RecordTable>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Roll no.</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead className="pr-6">Site role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => {
                return (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {p.email}
                      </div>
                    </TableCell>
                    <TableCell data-label="Roll no." className="tabular-nums">
                      {p.rollNumber ?? "—"}
                    </TableCell>
                    <TableCell data-label="Department">
                      {p.department ?? "—"}
                    </TableCell>
                    <TableCell data-label="Site role" className="pr-6">
                      <Badge
                        variant={
                          p.siteRole === "super_admin" ? "default" : "secondary"
                        }
                      >
                        {SITE_ROLE_LABEL[p.siteRole]}
                      </Badge>
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
