import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  decideRegistrationsAction,
  setPostStatusAction,
} from "@/app/dashboard/c/[slug]/posts/actions"

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  withDb: vi.fn(),
  getPostById: vi.fn(),
  setPostStatus: vi.fn(),
  decideRegistrations: vi.fn(),
  revalidate: vi.fn(),
}))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@/db", () => ({ withDb: mocks.withDb }))
vi.mock("@/lib/session", () => ({
  actionCommunityAccess: mocks.access,
  actionPostAccess: mocks.access,
}))
vi.mock("@/db/queries/posts", () => ({
  getPostById: mocks.getPostById,
  setPostStatus: mocks.setPostStatus,
  createPost: vi.fn(),
  deletePost: vi.fn(),
  setPostPinned: vi.fn(),
  updatePost: vi.fn(),
}))
vi.mock("@/db/queries/registrations", () => ({
  decideRegistrations: mocks.decideRegistrations,
}))
const postId = "c7c1339b-cf14-471a-96e8-82d8f93901df"
const registrationId = "b6ec664f-9905-4d39-b5c0-fc3434dc6b81"
const ctx = { actorId: "verified-user", tx: {} }
function form(fields: Record<string, string | string[]>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(fields))
    for (const entry of Array.isArray(value) ? value : [value])
      data.append(key, entry)
  return data
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.access.mockResolvedValue({
    user: { id: "verified-user" },
    community: { id: "community-a", slug: "club-a" },
    can: () => true,
  })
  mocks.withDb.mockImplementation(async (_actor, work) => work(ctx))
  mocks.getPostById.mockResolvedValue({
    id: postId,
    communityId: "community-a",
    slug: "event-a",
    isEvent: true,
  })
})
describe("event action ownership boundary", () => {
  it("rejects an event from another community even for an actor who operates both", async () => {
    mocks.getPostById.mockResolvedValue({
      id: postId,
      communityId: "community-b",
    })
    const result = await setPostStatusAction(
      null,
      form({ slug: "club-a", postId, status: "published" })
    )
    expect(result.ok).toBe(false)
    expect(mocks.setPostStatus).not.toHaveBeenCalled()
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })
  it("uses verified identity and exact community in the mutation", async () => {
    await setPostStatusAction(
      null,
      form({
        slug: "club-a",
        postId,
        status: "published",
        userId: "forged-user",
        communityId: "community-b",
      })
    )
    expect(mocks.withDb).toHaveBeenCalledWith(
      { userId: "verified-user" },
      expect.any(Function)
    )
    expect(mocks.setPostStatus).toHaveBeenCalledWith(
      ctx,
      "community-a",
      postId,
      "published"
    )
  })
  it("passes the full submitted batch to one atomic domain operation", async () => {
    const second = "08116243-476f-425b-b551-c590281474ab"
    await decideRegistrationsAction(
      null,
      form({
        slug: "club-a",
        postId,
        decision: "approve",
        registrationId: [registrationId, second],
      })
    )
    expect(mocks.decideRegistrations).toHaveBeenCalledOnce()
    expect(mocks.decideRegistrations).toHaveBeenCalledWith(ctx, {
      postId,
      ids: [registrationId, second],
      decision: "approve",
    })
  })
  it("returns a safe failure and does not revalidate when SQL denies a stale grant", async () => {
    mocks.decideRegistrations.mockRejectedValue(
      new Error("private database details")
    )
    const result = await decideRegistrationsAction(
      null,
      form({ slug: "club-a", postId, decision: "approve", registrationId })
    )
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toContain("private database details")
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })
})
