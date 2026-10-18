import Link from "next/link"
import { ActionForm } from "@/components/action-form"
import {
  EmptyState,
  FormFooter,
  PageHeader,
  Panel,
  RoleBadge,
} from "@/components/dashboard/ui"
import { FormSelect } from "@/components/form-select"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SITE_ROLE_LABEL } from "@/lib/rbac"
import { requireUser } from "@/lib/session"
import { updateProfileAction } from "@/app/dashboard/profile/actions"

const DEPARTMENTS = ["CMPN", "INFT", "EXTC", "BIOMED", "MECH", "CIVIL", "Other"]

export default async function ProfilePage() {
  const user = await requireUser()

  return (
    <>
      <PageHeader
        title="Profile"
        description="Organisers see your name, roll number and department when you register for an event."
      />

      <div className="grid gap-6 @5xl/main:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Registration details"
          description="Keep these up to date before joining an event."
        >
          <ActionForm
            key={[user.rollNumber, user.department, user.bio].join("|")}
            action={updateProfileAction}
          >
            <FieldGroup>
              <div className="grid gap-6 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="rollNumber">Roll number</FieldLabel>
                  <Input
                    id="rollNumber"
                    name="rollNumber"
                    defaultValue={user.rollNumber ?? ""}
                    placeholder="22101"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="department">Department</FieldLabel>
                  <FormSelect
                    id="department"
                    name="department"
                    label="Department"
                    defaultValue={user.department ?? ""}
                    items={[
                      { value: "", label: "Not set" },
                      ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
                    ]}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="bio">Bio</FieldLabel>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={user.bio ?? ""}
                  placeholder="A line about you"
                />
                <FieldDescription>
                  Shown to organisers alongside your registration.
                </FieldDescription>
              </Field>
              <FormFooter description="Shared with event organizers when you register.">
                <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
              </FormFooter>
            </FieldGroup>
          </ActionForm>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel
            title="Account"
            description="Name and email come from your VOSS account."
          >
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-medium">{user.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="min-w-0 text-right font-medium break-all">
                  {user.email}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Site role</dt>
                <dd className="font-medium">
                  {SITE_ROLE_LABEL[user.siteRole]}
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Teams">
            {user.memberships.length === 0 ? (
              <EmptyState
                title="No team memberships"
                body="Your community roles will appear here."
                className="border-0 px-0 py-3"
              />
            ) : (
              <ul className="grid gap-3">
                {user.memberships.map((m) => (
                  <li
                    key={m.communityId}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <Link
                      href={`/dashboard/c/${m.slug}`}
                      className="font-medium hover:underline"
                    >
                      {m.name}
                    </Link>
                    <RoleBadge role={m.role} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
