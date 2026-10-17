import type { CommunityRole, SiteRole } from "@/lib/rbac"

export type HomeRole =
  | "super_admin"
  | "admin"
  | "lead"
  | "manager"
  | "advisor"
  | "volunteer"
  | "student"

const COMMUNITY_RANK: Record<CommunityRole, number> = {
  lead: 4,
  manager: 3,
  advisor: 2,
  volunteer: 1,
}

export function homeRole(user: {
  siteRole: SiteRole
  memberships: { role: CommunityRole }[]
}): HomeRole {
  if (user.siteRole === "super_admin" || user.siteRole === "admin")
    return user.siteRole
  let best: CommunityRole | null = null
  for (const membership of user.memberships) {
    if (!best || COMMUNITY_RANK[membership.role] > COMMUNITY_RANK[best])
      best = membership.role
  }
  return best ?? "student"
}
