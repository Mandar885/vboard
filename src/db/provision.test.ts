import type { Pool } from "pg"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { provision } from "@/db/provision"

const safe = {
  rolsuper: false,
  rolbypassrls: false,
  rolreplication: false,
  rolcreaterole: false,
  rolcreatedb: false,
}
const options = {
  appPassword: "test-app-password",
  superAdminEmails: ["super@vit.edu.in"],
}
let flags = { ...safe }
let valid = true
const query = vi.fn(async (sql: string) => {
  if (sql.startsWith("SELECT rolsuper")) return { rows: [flags] }
  if (sql.startsWith("SELECT NOT r.rolsuper")) return { rows: [{ valid }] }
  return { rows: [] }
})
const release = vi.fn()
const pool = { connect: async () => ({ query, release }) } as unknown as Pool
beforeEach(() => {
  query.mockClear()
  release.mockClear()
  flags = { ...safe }
  valid = true
})

describe("managed-admin provisioning", () => {
  it("does not ALTER superuser-only attributes on safe roles", async () => {
    await provision(pool, options)
    const statements = query.mock.calls.map(([sql]) => sql)
    expect(
      statements.filter((sql) => sql.startsWith("ALTER ROLE"))
    ).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/NOSUPERUSER|NOBYPASSRLS|NOREPLICATION/),
      ])
    )
    expect(statements).toContain(
      "GRANT vboard_guard TO CURRENT_USER WITH INHERIT TRUE"
    )
    expect(statements).toContain(
      "GRANT vboard_guard TO CURRENT_USER WITH SET TRUE"
    )
    expect(
      statements.filter((sql) => sql.startsWith("GRANT vboard_guard"))
    ).toHaveLength(2)
    expect(statements).toContain("COMMIT")
    expect(statements).toContain("ALTER ROLE vboard_auth NOLOGIN PASSWORD NULL")
    expect(release).toHaveBeenCalledOnce()
  })

  it.each(["rolsuper", "rolbypassrls", "rolreplication"] as const)(
    "rejects an existing %s role without enabling login",
    async (flag) => {
      flags[flag] = true
      await expect(provision(pool, options)).rejects.toThrow(
        "unsafe role attributes"
      )
      const statements = query.mock.calls.map(([sql]) => sql)
      expect(statements).toContain("ROLLBACK")
      expect(statements.some((sql) => sql.includes("LOGIN PASSWORD"))).toBe(
        false
      )
      expect(statements).not.toContain("COMMIT")
    }
  )

  it("fails closed if role restriction or membership cleanup did not take effect", async () => {
    valid = false
    await expect(provision(pool, options)).rejects.toThrow(
      "restricted role requirements"
    )
    expect(query.mock.calls.map(([sql]) => sql)).toContain("ROLLBACK")
  })
})
