import { domainPolicies } from "@/db/schema/rls"
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"
import { user } from "./auth"

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    communityId: uuid("community_id"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    ...domainPolicies("audit"),
    index("audit_log_created_idx").on(t.createdAt),
    index("audit_log_community_idx").on(t.communityId),
  ]
).enableRLS()
