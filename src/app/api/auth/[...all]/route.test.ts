import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GET, POST } from "@/app/api/auth/[...all]/route"
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
}))
vi.mock("@/lib/auth", () => ({ auth: {}, verifyAuthDatabase: mocks.verify }))
vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({ GET: mocks.get, POST: mocks.post }),
}))
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv(
    "VOSS_DISCOVERY_URL",
    "https://accounts.vosslabs.org/api/auth/.well-known/openid-configuration"
  )
  vi.stubEnv("VOSS_CLIENT_ID", "fixture-client")
  vi.stubEnv("VOSS_CLIENT_SECRET", "fixture-secret")
})
afterEach(() => vi.unstubAllEnvs())
describe("auth route principal boundary", () => {
  it("rejects unsafe configuration before either Better Auth handler runs", async () => {
    mocks.verify.mockRejectedValue(new Error("Unsafe auth principal"))
    const request = new Request("http://localhost/api/auth/session")
    await expect(GET(request)).rejects.toThrow("Unsafe auth principal")
    await expect(POST(request)).rejects.toThrow("Unsafe auth principal")
    expect(mocks.get).not.toHaveBeenCalled()
    expect(mocks.post).not.toHaveBeenCalled()
  })
  it("awaits verification before passing the request to the handler", async () => {
    const request = new Request("http://localhost/api/auth/session")
    mocks.verify.mockImplementation(async () => {
      expect(mocks.get).not.toHaveBeenCalled()
    })
    mocks.get.mockResolvedValue(new Response("ok"))
    expect((await GET(request)).status).toBe(200)
    expect(mocks.get).toHaveBeenCalledWith(request)
  })
  it("rejects incomplete provider handshakes without touching the auth database", async () => {
    vi.stubEnv("VOSS_CLIENT_SECRET", "")
    for (const path of [
      "sign-in/oauth2",
      "oauth2/callback/voss",
      "oauth2/link",
    ]) {
      const response = await POST(
        new Request(`http://localhost/api/auth/${path}`)
      )
      expect(response.status).toBe(503)
      expect(await response.json()).toEqual({
        code: "VOSS_UNAVAILABLE",
        message: "VOSS sign-in is currently unavailable.",
      })
    }
    expect(
      (await GET(new Request("http://localhost/api/auth/oauth2/callback/voss")))
        .status
    ).toBe(503)
    expect(mocks.verify).not.toHaveBeenCalled()
    expect(mocks.post).not.toHaveBeenCalled()
    expect(mocks.get).not.toHaveBeenCalled()
  })
})
