import type { Pool } from "pg"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { migrate } from "@/db/migrate"

const files = vi.hoisted(() => vi.fn())
vi.mock("@/db/migration-files", () => ({ migrationFiles: files }))
const content = "SELECT 'migration content'"
let failure = false
const query = vi.fn(async (sql: string) => {
  if (sql.startsWith("SELECT to_regnamespace"))
    return { rows: [{ present: true }] }
  if (sql === content && failure) throw new Error("Migration failed")
  return { rows: [] }
})
const release = vi.fn()
const pool = { connect: async () => ({ query, release }) } as unknown as Pool
beforeEach(() => {
  query.mockClear()
  release.mockClear()
  failure = false
  files.mockResolvedValue([
    { filename: "0009_test.sql", checksum: "test-checksum", content },
  ])
})

describe("migration guard ownership privileges", () => {
  it("revokes temporary schema CREATE before recording or committing a migration", async () => {
    await migrate(pool)
    const statements = query.mock.calls.map(([sql]) => sql)
    const grant = statements.indexOf(
      "GRANT CREATE ON SCHEMA vboard_api TO vboard_guard"
    )
    const revoke = statements.indexOf(
      "REVOKE CREATE ON SCHEMA vboard_api FROM vboard_guard"
    )
    expect(grant).toBeGreaterThan(statements.indexOf("BEGIN"))
    expect(statements.indexOf(content)).toBeGreaterThan(grant)
    expect(revoke).toBeGreaterThan(statements.indexOf(content))
    expect(revoke).toBeLessThan(
      statements.findIndex((sql) =>
        sql.startsWith("INSERT INTO public._migrations")
      )
    )
    expect(revoke).toBeLessThan(statements.indexOf("COMMIT"))
  })

  it("rolls back the privilege grant with failed migration content", async () => {
    failure = true
    await expect(migrate(pool)).rejects.toThrow("Migration failed")
    const statements = query.mock.calls.map(([sql]) => sql)
    expect(statements).toContain(
      "GRANT CREATE ON SCHEMA vboard_api TO vboard_guard"
    )
    expect(statements).toContain("ROLLBACK")
    expect(statements).not.toContain("COMMIT")
    expect(
      statements.some((sql) => sql.startsWith("INSERT INTO public._migrations"))
    ).toBe(false)
    expect(release).toHaveBeenCalledOnce()
  })
})
