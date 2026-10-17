import { describe, expect, it } from "vitest"
import { canSeeEventStatus } from "@/lib/event-access"

const gdg = "community-gdg"

describe("canSeeEventStatus", () => {
  it("shows every published event to a student", () => {
    expect(
      canSeeEventStatus("published", gdg, {
        seeAll: false,
        readableCommunityIds: [],
      })
    ).toBe(true)
  })

  it("hides drafts, cancellations, and hidden events from a student", () => {
    const access = { seeAll: false, readableCommunityIds: [] as const }
    expect(canSeeEventStatus("draft", gdg, access)).toBe(false)
    expect(canSeeEventStatus("cancelled", gdg, access)).toBe(false)
    expect(canSeeEventStatus("completed", gdg, access)).toBe(false)
    expect(canSeeEventStatus("hidden", gdg, access)).toBe(false)
  })

  it("shows a community's unpublished events to someone who can read that community", () => {
    const access = { seeAll: false, readableCommunityIds: [gdg] }
    expect(canSeeEventStatus("draft", gdg, access)).toBe(true)
    expect(canSeeEventStatus("draft", "other", access)).toBe(false)
  })

  it("shows every status to a site admin", () => {
    const access = { seeAll: true, readableCommunityIds: [] as const }
    expect(canSeeEventStatus("hidden", gdg, access)).toBe(true)
  })
})
