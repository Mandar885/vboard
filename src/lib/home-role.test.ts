import { describe, expect, it } from "vitest"
import { homeRole } from "@/lib/home-role"
describe("homeRole presentation", () => {
  it("defaults an unassigned account to Student", () => {
    expect(homeRole({ siteRole: "student", memberships: [] })).toBe("student")
  })
  it("selects Lead over Organizer without altering assignments", () => {
    expect(
      homeRole({
        siteRole: "student",
        memberships: [{ role: "organizer" }, { role: "lead" }],
      })
    ).toBe("lead")
  })
  it("selects Organizer for an Organizer assignment", () => {
    expect(
      homeRole({ siteRole: "student", memberships: [{ role: "organizer" }] })
    ).toBe("organizer")
  })
  it("selects Super admin before committee presentation", () => {
    expect(
      homeRole({ siteRole: "super_admin", memberships: [{ role: "lead" }] })
    ).toBe("super_admin")
  })
})
