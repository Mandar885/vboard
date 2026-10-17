import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "./auth"
import { community } from "./communities"
import { communityRoleEnum, overrideEffectEnum } from "./enums"
import { post } from "./posts"

export const communityInvite = pgTable(
  "community_invite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => community.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: communityRoleEnum("role").notNull(),
    invitedBy: text("invited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("community_invite_unique").on(t.communityId, t.email),
    index("community_invite_email_idx").on(t.email),
  ]
)

export const eventHost = pgTable(
  "event_host",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id")
      .notNull()
      .references(() => post.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    addedBy: text("added_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("event_host_unique").on(t.postId, t.userId),
    index("event_host_user_idx").on(t.userId),
  ]
)

export const permissionOverride = pgTable(
  "permission_override",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    role: communityRoleEnum("role"),
    capability: text("capability").notNull(),
    effect: overrideEffectEnum("effect").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("permission_override_user_idx").on(t.userId),
    index("permission_override_role_idx").on(t.role),
  ]
)
