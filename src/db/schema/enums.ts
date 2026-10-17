import { pgEnum } from "drizzle-orm/pg-core"

export const siteRoleEnum = pgEnum("site_role", ["admin", "student"])

export const communityRoleEnum = pgEnum("community_role", [
  "lead",
  "manager",
  "volunteer",
  "advisor",
])

export const communityApprovalEnum = pgEnum("community_approval", [
  "pending",
  "approved",
])

export const overrideEffectEnum = pgEnum("override_effect", ["grant", "revoke"])

export const postVisibilityEnum = pgEnum("post_visibility", [
  "public",
  "vit_only",
])

export const locationVisibilityEnum = pgEnum("location_visibility", [
  "public",
  "after_approval",
])

export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "published",
  "cancelled",
  "completed",
  "hidden",
])

export const registrationStatusEnum = pgEnum("registration_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "attended",
  "no_show",
])
