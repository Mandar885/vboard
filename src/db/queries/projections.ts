import type { SQL } from "drizzle-orm"
import type { DbContext } from "@/db"

const DATE_FIELDS = new Set([
  "startsAt",
  "endsAt",
  "createdAt",
  "updatedAt",
  "registrationOpensAt",
  "registrationClosesAt",
  "registeredAt",
  "checkedInAt",
  "decidedAt",
  "joinedAt",
])

export async function projectionRows<T>(
  ctx: DbContext,
  query: SQL
): Promise<T[]> {
  const result = await ctx.tx.execute<{ data: Record<string, unknown> }>(query)
  return result.rows.map(
    ({ data }) =>
      Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          DATE_FIELDS.has(key) && typeof value === "string"
            ? new Date(value)
            : value,
        ])
      ) as T
  )
}

export function requireActor(ctx: DbContext) {
  if (!ctx.actorId) throw new Error("Sign in to continue")
  return ctx.actorId
}

export function requireRow<T>(rows: T[]) {
  if (!rows[0])
    throw new Error("The resource was not found or access was denied")
  return rows[0]
}
