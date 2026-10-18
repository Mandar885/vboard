import { beforeEach, describe, expect, it, vi } from "vitest"
import { signOutAction } from "@/lib/auth-actions"
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  revokeSession: vi.fn(),
  redirect: vi.fn(),
  removeCookie: vi.fn(),
  persona: false,
  headers: new Headers(),
}))
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signOut: mocks.signOut,
      getSession: mocks.getSession,
      revokeSession: mocks.revokeSession,
    },
  },
  verifyAuthDatabase: mocks.verify,
}))
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (mocks.persona ? { value: "student" } : undefined),
    delete: mocks.removeCookie,
  }),
  headers: async () => mocks.headers,
}))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
beforeEach(() => {
  vi.resetAllMocks()
  mocks.persona = false
  mocks.headers = new Headers({
    cookie: "better-auth.session_token=fixture-session",
  })
  mocks.signOut.mockResolvedValue({ success: true })
  mocks.getSession
    .mockResolvedValueOnce({ session: { token: "trusted-session" } })
    .mockResolvedValue(null)
  mocks.revokeSession.mockResolvedValue({ status: true })
})
describe("sign out auth boundary", () => {
  it("does not report success or call the adapter when principal verification rejects", async () => {
    mocks.verify.mockRejectedValue(new Error("Unsafe auth principal"))
    expect(await signOutAction()).toEqual({
      ok: false,
      error: "Sign-out did not complete. Try again.",
    })
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
  it("keeps the persona and avoids redirect when real session invalidation fails", async () => {
    mocks.persona = true
    mocks.signOut.mockRejectedValue(new Error("Database unavailable"))
    expect((await signOutAction()).ok).toBe(false)
    expect(mocks.removeCookie).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
  it("does not clear cookies or redirect when explicit revocation fails", async () => {
    mocks.persona = true
    mocks.revokeSession.mockRejectedValue(new Error("Session delete failed"))
    expect((await signOutAction()).ok).toBe(false)
    expect(mocks.revokeSession).toHaveBeenCalledWith({
      headers: mocks.headers,
      body: { token: "trusted-session" },
    })
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.removeCookie).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
  it("clears both identities and redirects after successful invalidation", async () => {
    mocks.persona = true
    await signOutAction()
    expect(mocks.verify).toHaveBeenCalledOnce()
    expect(mocks.signOut).toHaveBeenCalledOnce()
    expect(mocks.removeCookie).toHaveBeenCalledWith("vboard_dev_actor")
    expect(mocks.redirect).toHaveBeenCalledWith("/")
  })
  it("clears a local persona without an auth database call when no real session exists", async () => {
    mocks.persona = true
    mocks.headers = new Headers()
    await signOutAction()
    expect(mocks.verify).not.toHaveBeenCalled()
    expect(mocks.signOut).not.toHaveBeenCalled()
    expect(mocks.removeCookie).toHaveBeenCalledWith("vboard_dev_actor")
    expect(mocks.redirect).toHaveBeenCalledWith("/")
  })
})
