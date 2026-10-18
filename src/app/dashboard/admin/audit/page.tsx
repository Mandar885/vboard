import { RecordTable } from "@/components/dashboard/record-table"
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/ui"
import { Badge } from "@/components/ui/badge"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listAuditLog } from "@/db/queries/audit"
import { formatStamp } from "@/lib/format"
import { requireSiteCapability } from "@/lib/session"

function describe(details: Record<string, unknown> | null) {
  if (!details) return ""
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ")
}

export default async function AuditPage() {
  await requireSiteCapability("audit:read")
  const entries = await listAuditLog()

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every role change, publish, deletion and registration decision, newest first."
      />
      <Panel
        title="Recent activity"
        description={`Last ${entries.length} entries`}
        flush
      >
        {entries.length === 0 ? (
          <EmptyState
            className="m-4"
            title="Nothing recorded yet"
            body="Privileged changes will appear here as they happen."
          />
        ) : (
          <RecordTable>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="pr-6">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell
                    data-label="When"
                    className="text-muted-foreground pl-6"
                  >
                    {formatStamp(e.createdAt)}
                  </TableCell>
                  <TableCell data-label="Who" className="font-medium">
                    {e.actorName ?? "System"}
                  </TableCell>
                  <TableCell data-label="Action">
                    <Badge variant="outline" className="font-normal">
                      {e.action.replaceAll("_", " ").replaceAll(".", " · ")}
                    </Badge>
                  </TableCell>
                  <TableCell
                    data-label="Details"
                    className="text-muted-foreground max-w-md pr-6 break-words"
                  >
                    {describe(e.details)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </RecordTable>
        )}
      </Panel>
    </>
  )
}
