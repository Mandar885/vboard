import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  getCommunityAccess,
  getSessionUser,
  getTrustedActor,
} from "@/lib/session"
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  identity: vi.fn(),
  realSession: vi.fn(),
  withDb: vi.fn(),
  profile: vi.fn(),
  ensure: vi.fn(),
  superAdmin: vi.fn(),
  memberships: vi.fn(),
  community: vi.fn(),
}))
vi.mock("react", () => ({ cache: (fn: unknown) => fn }))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("Not found")
  },
  redirect: vi.fn(),
}))
vi.mock("@/lib/dev-auth", () => ({ devIdentity: mocks.identity }))
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.realSession } },
  verifyAuthDatabase: mocks.verify,
}))
vi.mock("@/db", () => ({ withDb: mocks.withDb }))
vi.mock("@/db/queries/profiles", () => ({
  ensureProfile: mocks.ensure,
  getProfile: mocks.profile,
  isSuperAdmin: mocks.superAdmin,
}))
vi.mock("@/db/queries/communities", () => ({
  getCommunityBySlug: mocks.community,
  listMembershipsForUser: mocks.memberships,
}))
const identity = {
  id: "verified-user",
  name: "Student",
  email: "student@vit.edu.in",
  image: null,
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.identity.mockResolvedValue(identity)
  mocks.withDb.mockImplementation(async (_actor, work) =>
    work({ actorId: identity.id, tx: {} })
  )
  mocks.profile.mockResolvedValue(null)
  mocks.superAdmin.mockResolvedValue(false)
  mocks.memberships.mockResolvedValue([])
  mocks.community.mockResolvedValue({
    id: "community-a",
    slug: "club-a",
    name: "Club A",
    isActive: true,
  })
})
describe("verified actor and current SQL authority", () => {
  it("rejects an invalid auth principal before invoking the session adapter", async () => {
    mocks.identity.mockResolvedValue(null)
    mocks.verify.mockRejectedValue(new Error("Unsafe auth principal"))
    await expect(getTrustedActor()).rejects.toThrow("Unsafe auth principal")
    expect(mocks.realSession).not.toHaveBeenCalled()
    expect(mocks.withDb).not.toHaveBeenCalled()
  })
  it("loads the exact verified identity into database context", async () => {
    expect(await getTrustedActor()).toEqual({ userId: identity.id })
    const user = await getSessionUser()
    expect(user?.siteRole).toBe("student")
    expect(mocks.withDb).toHaveBeenCalledWith(
      { userId: identity.id },
      expect.any(Function)
    )
  })
  it("refuses unverified or non-VIT real sessions before domain access", async () => {
    mocks.identity.mockResolvedValue(null)
    for (const user of [
      { ...identity, emailVerified: false },
      { ...identity, email: "staff@vosslabs.org", emailVerified: true },
    ]) {
      mocks.realSession.mockResolvedValue({ user })
      expect(await getTrustedActor()).toBeNull()
      expect(await getSessionUser()).toBeNull()
    }
    expect(mocks.withDb).not.toHaveBeenCalled()
  })
  it("uses the current SQL allowlist result for Super admin", async () => {
    mocks.superAdmin.mockResolvedValue(true)
    expect((await getSessionUser())?.siteRole).toBe("super_admin")
    mocks.superAdmin.mockResolvedValue(false)
    expect((await getSessionUser())?.siteRole).toBe("student")
  })
  it("rereads assignments and denies a grant revoked since rendering", async () => {
    const user = await getSessionUser()
    if (!user) throw new Error("Expected identity")
    const stale = {
      ...user,
      memberships: [
        {
          communityId: "community-a",
          slug: "club-a",
          name: "Club A",
          role: "lead" as const,
        },
      ],
    }
    expect(await getCommunityAccess(stale, "club-a")).toBeNull()
  })
  it("requires active community authority while retaining Super admin recovery", async () => {
    const user = await getSessionUser()
    if (!user) throw new Error("Expected identity")
    mocks.community.mockResolvedValue({
      id: "community-a",
      slug: "club-a",
      name: "Club A",
      isActive: false,
    })
    mocks.memberships.mockResolvedValue([
      {
        communityId: "community-a",
        slug: "club-a",
        name: "Club A",
        role: "lead",
      },
    ])
    expect(await getCommunityAccess(user, "club-a")).toBeNull()
    mocks.superAdmin.mockResolvedValue(true)
    expect(
      (await getCommunityAccess(user, "club-a"))?.can("member:manage")
    ).toBe(true)
  })
  it("does not carry another community's assignment into this community", async () => {
    const user = await getSessionUser()
    if (!user) throw new Error("Expected identity")
    mocks.memberships.mockResolvedValue([
      {
        communityId: "community-b",
        slug: "club-b",
        name: "Club B",
        role: "lead",
      },
    ])
    expect(await getCommunityAccess(user, "club-a")).toBeNull()
  })
})
