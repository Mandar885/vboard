import { afterEach, describe, expect, it, vi } from "vitest"
import { authFlowFixture } from "@/lib/auth-flow.fixture"
import { revokeProductSession } from "@/lib/auth-session"

afterEach(() => vi.unstubAllGlobals())

describe("authoritative product-session sign-out", () => {
  it.each(["throw", "ignore"])(
    "refuses false library success when the adapter's delete would %s",
    async (failure) => {
      const fixture = authFlowFixture()
      const completed = await fixture.callback()
      const headers = new Headers({ cookie: completed.sessionCookie })
      let rows = fixture.store.session
      Object.defineProperty(fixture.store, "session", {
        configurable: true,
        get: () => rows,
        set: (next: typeof rows) => {
          if (next.length < rows.length) {
            if (failure === "throw")
              throw new Error("Injected session delete failure")
            return
          }
          rows = next
        },
      })
      expect(await fixture.auth.api.getSession({ headers })).not.toBeNull()
      expect(await fixture.auth.api.signOut({ headers })).toEqual({
        success: true,
      })
      expect(fixture.store.session).toHaveLength(1)
      expect(await fixture.auth.api.getSession({ headers })).not.toBeNull()
      const clearCookies = vi.spyOn(fixture.auth.api, "signOut")
      await expect(
        revokeProductSession(fixture.auth.api, headers)
      ).rejects.toThrow()
      expect(clearCookies).not.toHaveBeenCalled()
      expect(fixture.store.session).toHaveLength(1)
      expect(await fixture.auth.api.getSession({ headers })).not.toBeNull()
    }
  )

  it("does not revoke a raw client token that the library cannot authenticate", async () => {
    const fixture = authFlowFixture()
    const completed = await fixture.callback()
    const rawToken = fixture.store.session[0].token
    const revoke = vi.spyOn(fixture.auth.api, "revokeSession")
    await revokeProductSession(
      fixture.auth.api,
      new Headers({ cookie: `better-auth.session_token=${rawToken}` })
    )
    expect(revoke).not.toHaveBeenCalled()
    expect(fixture.store.session).toHaveLength(1)
    expect(
      await fixture.auth.api.getSession({
        headers: new Headers({ cookie: completed.sessionCookie }),
      })
    ).not.toBeNull()
  })
})
