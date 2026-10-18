import { RecordTable } from "@/components/dashboard/record-table"
import { ActionForm } from "@/components/action-form"
import { ConfirmSubmit } from "@/components/confirm-submit"
import { AutoSubmitSelect } from "@/components/dashboard/role-select"
import {
  EmptyState,
  FormFooter,
  Panel,
  RoleBadge,
} from "@/components/dashboard/ui"
import { FormSelect } from "@/components/form-select"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
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
import { listMembers } from "@/db/queries/members"
import {
  assignableCommunityRoles,
  canChangeMember,
  COMMUNITY_ROLE_DESCRIPTION,
  COMMUNITY_ROLE_LABEL,
  type CommunityRole,
} from "@/lib/rbac"
import { requireCommunityAccess } from "@/lib/session"
import {
  addMemberAction,
  changeMemberRoleAction,
  removeMemberAction,
} from "@/app/dashboard/c/[slug]/team/actions"

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const access = await requireCommunityAccess(slug, "member:read")
  const members = await listMembers(access.community.id)
  const assignable = assignableCommunityRoles(access.user.siteRole, access.role)
  const canManage = access.can("member:manage")
  const actor = { siteRole: access.user.siteRole, communityRole: access.role }

  return (
    <div className="grid gap-6 @5xl/main:grid-cols-[1.7fr_1fr]">
      <Panel
        title="Team"
        description={`${members.length} people help run ${access.community.name}.`}
        flush
      >
        {members.length === 0 ? (
          <EmptyState
            title="No team members"
            body="Add an existing vboard account to start building this team."
            className="m-4"
          />
        ) : (
          <RecordTable>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Member</TableHead>
                <TableHead>Roll no.</TableHead>
                <TableHead>Role</TableHead>
                {canManage && (
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const editable =
                  canManage &&
                  canChangeMember(actor, {
                    role: m.role,
                    isSelf: m.userId === access.user.id,
                  })
                return (
                  <TableRow key={m.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2 font-medium">
                        {m.name}
                        {m.userId === access.user.id && (
                          <Badge variant="secondary">You</Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {m.email}
                      </div>
                    </TableCell>
                    <TableCell data-label="Roll no." className="tabular-nums">
                      {m.rollNumber ?? "—"}
                    </TableCell>
                    <TableCell data-label="Role">
                      {editable ? (
                        <AutoSubmitSelect
                          action={changeMemberRoleAction}
                          hidden={{ slug, memberId: m.id }}
                          name="role"
                          label={`Role for ${m.name}`}
                          current={m.role}
                          options={(assignable.includes(m.role)
                            ? assignable
                            : [m.role, ...assignable]
                          ).map((r) => ({
                            value: r,
                            label: COMMUNITY_ROLE_LABEL[r],
                          }))}
                        />
                      ) : (
                        <RoleBadge role={m.role} />
                      )}
                    </TableCell>
                    {canManage && (
                      <TableCell
                        data-label="Actions"
                        className="pr-6 text-right"
                      >
                        {editable && (
                          <ActionForm
                            action={removeMemberAction}
                            className="inline"
                          >
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="memberId" value={m.id} />
                            <ConfirmSubmit
                              label="Remove"
                              title={`Remove ${m.name}?`}
                              description="They lose access to this community's dashboard straight away."
                              confirmLabel="Remove"
                            />
                          </ActionForm>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </RecordTable>
        )}
      </Panel>

      <div className="flex flex-col gap-6">
        {canManage && (
          <Panel
            title="Add to the team"
            description="Add someone who has already signed in to vboard. Their role determines what they can manage."
          >
            <ActionForm action={addMemberAction}>
              <input type="hidden" name="slug" value={slug} />
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">VIT email</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="name.surname@vit.edu.in"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="role">Role</FieldLabel>
                  <FormSelect
                    id="role"
                    name="role"
                    label="Role"
                    defaultValue={
                      assignable.includes("manager") ? "manager" : assignable[0]
                    }
                    items={assignable.map((r) => ({
                      value: r,
                      label: COMMUNITY_ROLE_LABEL[r],
                    }))}
                  />
                  <FieldDescription>
                    {access.role === "lead"
                      ? "Only vboard admins appoint leads."
                      : "Admins can appoint leads."}
                  </FieldDescription>
                </Field>
                <FormFooter>
                  <SubmitButton pendingLabel="Adding…">Add member</SubmitButton>
                </FormFooter>
              </FieldGroup>
            </ActionForm>
          </Panel>
        )}

        <Panel title="What each role can do">
          <ul className="grid gap-4">
            {(["lead", "manager", "volunteer"] as CommunityRole[]).map((r) => (
              <li key={r} className="grid gap-1.5">
                <RoleBadge role={r} />
                <p className="text-muted-foreground text-sm">
                  {COMMUNITY_ROLE_DESCRIPTION[r]}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
