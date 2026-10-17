import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "./auth"
import { community } from "./communities"
import {
  locationVisibilityEnum,
  postStatusEnum,
  postVisibilityEnum,
} from "./enums"

export const post = pgTable(
  "post",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    communityId: uuid("community_id")
      .notNull()
      .references(() => community.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    visibility: postVisibilityEnum("visibility").notNull().default("public"),
    isPinned: boolean("is_pinned").notNull().default(false),
    status: postStatusEnum("status").notNull().default("draft"),
    isEvent: boolean("is_event").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),
    locationVisibility: locationVisibilityEnum("location_visibility"),
    registrationOpensAt: timestamp("registration_opens_at", {
      withTimezone: true,
    }),
    registrationClosesAt: timestamp("registration_closes_at", {
      withTimezone: true,
    }),
    capacity: integer("capacity"),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    advisorApprovedAt: timestamp("advisor_approved_at", { withTimezone: true }),
    advisorApprovedBy: text("advisor_approved_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("post_community_idx").on(t.communityId),
    index("post_status_idx").on(t.status),
    index("post_starts_at_idx").on(t.startsAt),
  ]
)
