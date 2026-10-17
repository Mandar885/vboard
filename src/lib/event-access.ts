export type EventStatus =
  "draft" | "published" | "cancelled" | "completed" | "hidden"

export function canSeeEventStatus(
  status: EventStatus,
  communityId: string,
  access: { seeAll: boolean; readableCommunityIds: readonly string[] }
): boolean {
  if (access.seeAll) return true
  if (status === "published") return true
  return access.readableCommunityIds.includes(communityId)
}
