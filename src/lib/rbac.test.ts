import { describe, expect, it } from "vitest"
import {
  assignableCommunityRoles,
  canChangeMember,
  communityCan,
  communityCapabilities,
  siteCan,
} from "@/lib/rbac"
describe("four-role capabilities", () => {
  it("reserves platform administration for Super admin", () => {
    expect(siteCan("student", "community:create")).toBe(false)
    expect(siteCan("super_admin", "community:assignLead")).toBe(true)
  })
  it("gives Lead every Organizer operation and team/settings authority", () => {
    for (const capability of communityCapabilities("student", "organizer"))
      expect(communityCan("student", "lead", capability)).toBe(true)
    expect(communityCan("student", "lead", "member:manage")).toBe(true)
    expect(communityCan("student", "lead", "community:update")).toBe(true)
  })
  it("denies Organizer team data and settings while allowing event operations", () => {
    expect(communityCan("student", "organizer", "registration:export")).toBe(
      true
    )
    expect(communityCan("student", "organizer", "registration:checkin")).toBe(
      true
    )
    expect(communityCan("student", "organizer", "member:read")).toBe(false)
    expect(communityCan("student", "organizer", "member:manage")).toBe(false)
    expect(communityCan("student", "organizer", "community:update")).toBe(false)
  })
  it("grants no committee authority without an assignment", () => {
    expect(communityCan("student", null, "post:read")).toBe(false)
    expect(communityCan("super_admin", null, "registration:export")).toBe(true)
  })
  it("allows only Super admin to appoint or change Leads", () => {
    expect(assignableCommunityRoles("super_admin", null)).toEqual([
      "lead",
      "organizer",
    ])
    expect(assignableCommunityRoles("student", "lead")).toEqual(["organizer"])
    expect(assignableCommunityRoles("student", "organizer")).toEqual([])
    const lead = {
      siteRole: "student" as const,
      communityRole: "lead" as const,
    }
    expect(canChangeMember(lead, { role: "lead", isSelf: false })).toBe(false)
    expect(canChangeMember(lead, { role: "lead", isSelf: true })).toBe(false)
    expect(canChangeMember(lead, { role: "organizer", isSelf: false })).toBe(
      true
    )
  })
})
