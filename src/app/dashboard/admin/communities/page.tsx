import { withDb } from "@/db"
import { RecordTable } from "@/components/dashboard/record-table"
import Link from "next/link"
import { ActionForm } from "@/components/action-form"
import { ConfirmSubmit } from "@/components/confirm-submit"
import {
  EmptyState,
  FormFooter,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/dashboard/ui"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { listAllCommunities } from "@/db/queries/communities"
import { formatStamp } from "@/lib/format"
import { requireSiteCapability } from "@/lib/session"
import {
  createCommunityAction,
  setCommunityActiveAction,
} from "@/app/dashboard/admin/actions"

export default async function AdminCommunitiesPage() {
  const user = await requireSiteCapability("community:create")
  const communities = await withDb({ userId: user.id }, async (ctx) =>
    listAllCommunities(ctx)
  )

  return (
    <>
      <PageHeader
        title="Communities"
        description="Create a community and hand it to its lead; leads build their own team from there. Archiving hides a community and its posts without deleting anything."
      />
      <div className="grid gap-6 @5xl/main:grid-cols-[1.7fr_1fr]">
        <Panel
          title="All communities"
          description={`${communities.length} on vboard`}
          flush
        >
          {communities.length === 0 ? (
            <EmptyState
              className="m-4"
              title="No communities yet"
              body="Create a community and appoint a lead to get started."
            />
          ) : (
            <RecordTable>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Community</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {communities.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6">
                      <Link
                        href={`/dashboard/c/${c.slug}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      <div className="text-muted-foreground text-xs">
                        /{c.slug} · {formatStamp(c.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell data-label="Team" className="tabular-nums">
                      {c.teamCount}
                    </TableCell>
                    <TableCell data-label="Posts" className="tabular-nums">
                      {c.postCount}
                    </TableCell>
                    <TableCell data-label="Status">
                      <StatusBadge
                        status={c.isActive ? "active" : "archived"}
                      />
                    </TableCell>
                    <TableCell data-label="Action" className="pr-6 text-right">
                      <ActionForm
                        action={setCommunityActiveAction}
                        className="inline"
                      >
                        <input type="hidden" name="communityId" value={c.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={c.isActive ? "false" : "true"}
                        />
                        {c.isActive ? (
                          <ConfirmSubmit
                            label="Archive"
                            title={`Archive ${c.name}?`}
                            description="Its posts leave the public site and its team loses dashboard access. You can restore it later."
                            confirmLabel="Archive"
                          />
                        ) : (
                          <SubmitButton size="sm" variant="outline">
                            Restore
                          </SubmitButton>
                        )}
                      </ActionForm>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </RecordTable>
          )}
        </Panel>

        <Panel title="New community">
          <ActionForm action={createCommunityAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Robotics Club"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="slug">Address</FieldLabel>
                <Input
                  id="slug"
                  name="slug"
                  required
                  placeholder="robotics-club"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                />
                <FieldDescription>
                  Lowercase letters, numbers and hyphens.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="description">About</FieldLabel>
                <Textarea id="description" name="description" />
              </Field>
              <Field>
                <FieldLabel htmlFor="leadEmail">Lead email</FieldLabel>
                <Input
                  id="leadEmail"
                  name="leadEmail"
                  type="email"
                  placeholder="Optional"
                />
                <FieldDescription>
                  The lead must have signed in once.
                </FieldDescription>
              </Field>
              <FormFooter>
                <SubmitButton pendingLabel="Creating…">
                  Create community
                </SubmitButton>
              </FormFooter>
            </FieldGroup>
          </ActionForm>
        </Panel>
      </div>
    </>
  )
}
