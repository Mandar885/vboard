import { cache } from "react"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { devIdentity } from "@/lib/dev-auth"
import { parseEmailList, normalizeEmail } from "@/lib/identity"
import {
  adminCoversDepartment,
  COHOST_CAPABILITIES,
  communityCan,
  communityCapabilities,
  isSiteAdmin,
  siteCan,
  type CommunityCapability,
  type CommunityRole,
  type PermissionOverride,
  type SiteCapability,
  type SiteRole,
} from "@/lib/rbac"
import { getProfile } from "@/db/queries/profiles"
import {
  claimInvites,
  listHostedPostIds,
  listPermissionOverrides,
} from "@/db/queries/access"
import {
  getCommunityBySlug,
  listMembershipsForUser,
} from "@/db/queries/communities"

export type Membership = {
  communityId: string
  slug: string
  name: string
  role: CommunityRole
}

export type SessionUser = {
  id: string
  name: string
  email: string
  image: string | null
  siteRole: SiteRole
  rollNumber: string | null
  department: string | null
  bio: string | null
  adminDepartment: string | null
  overrides: PermissionOverride[]
  memberships: Membership[]
}

async function realIdentity() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  }
}

function isSuperAdminEmail(email: string): boolean {
  return parseEmailList(process.env.SUPER_ADMIN_EMAILS).includes(
    normalizeEmail(email)
  )
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const identity = (await devIdentity()) ?? (await realIdentity())
  if (!identity) return null

  await claimInvites(identity.id, identity.email)
  const [profile, memberships, overrides] = await Promise.all([
    getProfile(identity.id),
    listMembershipsForUser(identity.id),
    listPermissionOverrides(),
  ])

  const siteRole: SiteRole = isSuperAdminEmail(identity.email)
    ? "super_admin"
    : (profile?.siteRole ?? "student")

  return {
    ...identity,
    siteRole,
    rollNumber: profile?.rollNumber ?? null,
    department: profile?.department ?? null,
    bio: profile?.bio ?? null,
    adminDepartment: profile?.adminDepartment ?? null,
    overrides,
    memberships,
  }
})

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect("/login")
  return user
}

export async function requireSiteCapability(
  capability: SiteCapability
): Promise<SessionUser> {
  const user = await requireUser()
  if (!siteCan(user.siteRole, capability)) notFound()
  return user
}

export function roleIn(
  user: SessionUser,
  communityId: string
): CommunityRole | null {
  return (
    user.memberships.find((m) => m.communityId === communityId)?.role ?? null
  )
}

export type CommunityAccess = {
  user: SessionUser
  community: NonNullable<Awaited<ReturnType<typeof getCommunityBySlug>>>
  role: CommunityRole | null
  capabilities: ReadonlySet<CommunityCapability>
  hostedPostIds: string[] | null
  can: (capability: CommunityCapability) => boolean
}

function permissionCtx(user: SessionUser) {
  return { userId: user.id, overrides: user.overrides }
}

function cohostCan(user: SessionUser, capability: CommunityCapability) {
  if (user.siteRole === "super_admin") return true
  let allowed = COHOST_CAPABILITIES.includes(capability)
  for (const override of user.overrides) {
    if (override.userId !== user.id || override.capability !== capability)
      continue
    allowed = override.effect === "grant"
  }
  return allowed
}

export async function getCommunityAccess(
  user: SessionUser,
  slug: string
): Promise<CommunityAccess | null> {
  const community = await getCommunityBySlug(slug)
  if (!community) return null
  if (
    !adminCoversDepartment(
      user.siteRole,
      user.adminDepartment,
      community.department
    )
  )
    return null
  const role = roleIn(user, community.id)
  const capabilities = communityCapabilities(user.siteRole, role)
  const granted = user.overrides.some(
    (override) => override.userId === user.id && override.effect === "grant"
  )
  if (capabilities.size === 0 && !granted) return null
  return {
    user,
    community,
    role,
    capabilities,
    hostedPostIds: null,
    can: (capability) =>
      communityCan(user.siteRole, role, capability, permissionCtx(user)),
  }
}

async function cohostAccess(
  user: SessionUser,
  community: NonNullable<Awaited<ReturnType<typeof getCommunityBySlug>>>
): Promise<CommunityAccess | null> {
  if (!community.isActive) return null
  if (
    !adminCoversDepartment(
      user.siteRole,
      user.adminDepartment,
      community.department
    )
  )
    return null
  const hostedPostIds = await listHostedPostIds(user.id, community.id)
  if (hostedPostIds.length === 0) return null
  return {
    user,
    community,
    role: null,
    capabilities: new Set(COHOST_CAPABILITIES),
    hostedPostIds,
    can: (capability) => cohostCan(user, capability),
  }
}

export async function requireCommunityAccess(
  slug: string,
  capability: CommunityCapability = "post:read"
): Promise<CommunityAccess> {
  const user = await requireUser()
  const access = await getCommunityAccess(user, slug)
  if (access?.can(capability)) return access
  if (capability === "post:read") {
    const community = await getCommunityBySlug(slug)
    if (community) {
      const hosted = await cohostAccess(user, community)
      if (hosted?.can(capability)) return hosted
    }
  }
  notFound()
}

export async function actionCommunityAccess(
  slug: unknown,
  capability: CommunityCapability
): Promise<CommunityAccess | null> {
  if (typeof slug !== "string" || !slug) return null
  const user = await getSessionUser()
  if (!user) return null
  const access = await getCommunityAccess(user, slug)
  if (!access || !access.can(capability)) return null
  if (!access.community.isActive && !isSiteAdmin(user.siteRole)) return null
  return access
}

export async function actionPostAccess(
  slug: unknown,
  postId: unknown,
  capability: CommunityCapability
): Promise<CommunityAccess | null> {
  const access = await actionCommunityAccess(slug, capability)
  if (access) return access
  if (typeof slug !== "string" || typeof postId !== "string") return null
  const user = await getSessionUser()
  if (!user) return null
  const community = await getCommunityBySlug(slug)
  if (!community) return null
  const hosted = await cohostAccess(user, community)
  if (!hosted?.hostedPostIds?.includes(postId) || !hosted.can(capability))
    return null
  return hosted
}
