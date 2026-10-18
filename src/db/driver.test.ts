import { afterEach, describe, expect, it, vi } from "vitest"
import { isLocalPostgres, requireLocalDatabase } from "@/db/driver"

const local = "postgresql://fixture_user:fake@localhost:5434/vboard"

afterEach(() => vi.unstubAllEnvs())

describe("local database target guard", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])(
    "accepts an explicit loopback target at %s",
    (host) => {
      const url = `postgresql://fixture_user:fake@${host}:5434/vboard`
      expect(isLocalPostgres(url)).toBe(true)
      expect(requireLocalDatabase(url).hostname).toBe(host)
    }
  )

  it.each([
    "host=production.example",
    "host=127.0.0.1",
    "hostaddr=203.0.113.1",
    "service=production",
    "servicefile=%2Ftmp%2Fpg_service.conf",
    "host=%2Ftmp",
    "port=5435",
    "database=other",
    "dbname=other",
    "connectionString=postgresql%3A%2F%2Fproduction.example%2Fvboard",
    "options=-c%20search_path%3Dother",
  ])("rejects query routing overrides: %s", (query) => {
    expect(isLocalPostgres(`${local}?${query}`)).toBe(false)
    expect(() => requireLocalDatabase(`${local}?${query}`)).toThrow(
      /routing overrides/
    )
  })

  it.each([
    "postgresql://fixture_user:fake@production.example/vboard",
    "postgresql:///vboard",
    "postgresql://localhost",
    "socket:/tmp?db=vboard",
    "file:///tmp/vboard",
    "invalid",
  ])("rejects nonexplicit PostgreSQL loopback targets", (url) => {
    expect(isLocalPostgres(url)).toBe(false)
    expect(() => requireLocalDatabase(url)).toThrow()
  })

  it("permits connection options that cannot replace the target", () => {
    expect(
      isLocalPostgres(`${local}?sslmode=disable&application_name=fixtures`)
    ).toBe(true)
  })

  it("uses the explicit target when PostgreSQL environment defaults are remote", () => {
    vi.stubEnv("PGHOST", "production.example")
    vi.stubEnv("PGDATABASE", "production")
    expect(requireLocalDatabase(local).pathname).toBe("/vboard")
  })

  it("requires the effective disposable database name to have the test prefix", () => {
    expect(() => requireLocalDatabase(local, true)).toThrow(/vboard_test_/)
    expect(
      requireLocalDatabase(`${local}_test_fresh_fixture`, true).pathname
    ).toBe("/vboard_test_fresh_fixture")
    expect(() =>
      requireLocalDatabase(`${local}_test_fixture%2Fother`, true)
    ).toThrow(/vboard_test_/)
  })
})
