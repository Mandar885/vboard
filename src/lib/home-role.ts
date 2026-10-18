import type { CommunityRole, SiteRole } from "@/lib/rbac"
export type HomeRole = "super_admin" | "lead" | "organizer" | "student"
export function homeRole(user: {
  siteRole: SiteRole
  memberships: { role: CommunityRole }[]
}): HomeRole {
  if (user.siteRole === "super_admin") return "super_admin"
  if (user.memberships.some((membership) => membership.role === "lead"))
    return "lead"
  return user.memberships.length ? "organizer" : "student"
}
