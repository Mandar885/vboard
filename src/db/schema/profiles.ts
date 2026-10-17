import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { siteRoleEnum } from "./enums"

export const profile = pgTable(
  "profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    siteRole: siteRoleEnum("site_role").notNull().default("student"),
    rollNumber: text("roll_number"),
    department: text("department"),
    adminDepartment: text("admin_department"),
    bio: text("bio"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("profile_roll_number_idx").on(t.rollNumber)]
)
