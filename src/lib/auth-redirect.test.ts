import { describe, expect, it } from "vitest"
import { safeReturnPath } from "@/lib/auth-redirect"

describe("authentication return paths", () => {
  it.each([
    "/",
    "/dashboard",
    "/posts/event?tab=details&next=https%3A%2F%2Fexample.com",
    "/calendar?month=2026-10#events",
  ])("preserves internal path and query: %s", (path) => {
    expect(safeReturnPath(path)).toBe(path)
  })
  it.each([
    undefined,
    null,
    "",
    "https://external.example",
    "//external.example",
    "/\\external.example",
    "\\external.example",
    "/\n/external.example",
    "/\r/external.example",
    "/\t/external.example",
    "/dashboard\u0000",
    "/dashboard\u007f",
  ])("rejects external or ambiguous redirect input", (path) => {
    expect(safeReturnPath(path)).toBe("/dashboard")
  })
})
