import { domainPolicies } from "@/db/schema/rls"
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { user } from "./auth"

export const profile = pgTable(
  "profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "restrict" }),
    rollNumber: text("roll_number"),
    department: text("department"),
    bio: text("bio"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    ...domainPolicies("profile"),
    index("profile_roll_number_idx").on(t.rollNumber),
  ]
).enableRLS()
