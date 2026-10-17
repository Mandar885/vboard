import { describe, expect, it } from "vitest"
import { homeRole } from "@/lib/home-role"

describe("homeRole", () => {
  it("gives a person with no team the student view", () => {
    expect(homeRole({ siteRole: "student", memberships: [] })).toBe("student")
  })

  it("uses the highest community role when someone belongs to more than one", () => {
    expect(
      homeRole({
        siteRole: "student",
        memberships: [{ role: "volunteer" }, { role: "lead" }],
      })
    ).toBe("lead")
    expect(
      homeRole({
        siteRole: "student",
        memberships: [{ role: "advisor" }, { role: "manager" }],
      })
    ).toBe("manager")
  })

  it("lets a site role replace the community role", () => {
    expect(
      homeRole({
        siteRole: "admin",
        memberships: [{ role: "lead" }],
      })
    ).toBe("admin")
    expect(homeRole({ siteRole: "super_admin", memberships: [] })).toBe(
      "super_admin"
    )
  })
})
