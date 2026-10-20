import Link from "next/link"
import {
  EmptyState,
  PageHeader,
  Panel,
  RoleBadge,
} from "@/components/dashboard/ui"
import { SITE_ROLE_LABEL } from "@/lib/rbac"
import { requireUser } from "@/lib/session"
import { ProfileForm } from "@/app/dashboard/profile/profile-form"

export default async function ProfilePage() {
  const user = await requireUser()
  const academicDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())

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
          <ProfileForm
            key={[user.rollNumber, user.department, user.bio].join("|")}
            initialRollNumber={user.rollNumber}
            initialBio={user.bio}
            academicDate={academicDate}
          />
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
