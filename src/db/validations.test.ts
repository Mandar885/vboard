import { describe, expect, it } from "vitest"
import {
  memberFormSchema,
  newCommunitySchema,
  postFormSchema,
  profileFormSchema,
} from "@/db/validations"

const base = {
  title: "Build with Gemma",
  body: "Workshop",
  visibility: "public",
  locationVisibility: "public",
  startsAt: "",
  endsAt: "",
  location: "",
  registrationOpensAt: "",
  registrationClosesAt: "",
  capacity: "",
  intent: "publish",
}

describe("postFormSchema", () => {
  it("accepts a text post and clears event fields", () => {
    const result = postFormSchema.safeParse({
      ...base,
      startsAt: "2026-10-01T10:00",
    })
    expect(result.success).toBe(true)
    expect(result.data?.startsAt).toBeNull()
  })

  it("requires start and end for an event", () => {
    const result = postFormSchema.safeParse({ ...base, isEvent: "on" })
    expect(result.success).toBe(false)
  })

  it("rejects an event that ends before it starts", () => {
    const result = postFormSchema.safeParse({
      ...base,
      isEvent: "on",
      startsAt: "2026-10-01T10:00",
      endsAt: "2026-10-01T09:00",
    })
    expect(result.success).toBe(false)
  })

  it("parses a valid event in IST", () => {
    const result = postFormSchema.safeParse({
      ...base,
      isEvent: "on",
      startsAt: "2026-10-01T10:00",
      endsAt: "2026-10-01T12:00",
      capacity: "40",
      requiresApproval: "on",
    })
    expect(result.success).toBe(true)
    expect(result.data?.startsAt?.toISOString()).toBe(
      "2026-10-01T04:30:00.000Z"
    )
    expect(result.data?.capacity).toBe(40)
    expect(result.data?.requiresApproval).toBe(true)
  })

  it("rejects a fractional capacity", () => {
    const result = postFormSchema.safeParse({
      ...base,
      isEvent: "on",
      startsAt: "2026-10-01T10:00",
      endsAt: "2026-10-01T12:00",
      capacity: "2.5",
    })
    expect(result.success).toBe(false)
  })
})

describe("newCommunitySchema", () => {
  it("rejects a slug with spaces", () => {
    const result = newCommunitySchema.safeParse({
      name: "Coding Club",
      slug: "coding club",
      description: "",
      leadEmail: "",
    })
    expect(result.success).toBe(false)
  })

  it("allows a community without a lead", () => {
    const result = newCommunitySchema.safeParse({
      name: "Coding Club",
      slug: "coding-club",
      description: "",
      leadEmail: "",
    })
    expect(result.success).toBe(true)
    expect(result.data?.leadEmail).toBeNull()
  })
})

describe("strict writable field boundaries", () => {
  it("rejects client authority fields on profile and post input", () => {
    expect(
      profileFormSchema.safeParse({
        rollNumber: "",
        department: "",
        bio: "",
        siteRole: "super_admin",
      }).success
    ).toBe(false)
    expect(
      postFormSchema.safeParse({ ...base, authorId: "forged" }).success
    ).toBe(false)
  })
  it("accepts only current schema community roles", () => {
    expect(
      memberFormSchema.safeParse({
        email: "student@vit.edu.in",
        role: "organizer",
      }).success
    ).toBe(true)
    expect(
      memberFormSchema.safeParse({
        email: "student@vit.edu.in",
        role: "manager",
      }).success
    ).toBe(false)
    expect(
      memberFormSchema.safeParse({
        email: "student@vit.edu.in",
        role: "organizer",
        addedBy: "forged",
      }).success
    ).toBe(false)
  })
})
