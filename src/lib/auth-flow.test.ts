import { createHash } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vitest"
import { authFlowFixture, AUTH_ORIGIN } from "@/lib/auth-flow.fixture"
import { revokeProductSession } from "@/lib/auth-session"

afterEach(() => vi.unstubAllGlobals())

describe("Better Auth VOSS callback integration with a mocked provider", () => {
  it("exchanges a code with PKCE/post authentication and creates a named verified session", async () => {
    const fixture = authFlowFixture()
    const completed = await fixture.callback()
    expect(completed.response.status).toBe(302)
    expect(
      new URL(completed.response.headers.get("location")!, AUTH_ORIGIN).href
    ).toBe(`${AUTH_ORIGIN}/dashboard`)
    expect(completed.authorization.searchParams.get("redirect_uri")).toBe(
      `${AUTH_ORIGIN}/api/auth/oauth2/callback/voss`
    )
    expect(completed.authorization.searchParams.get("scope")).toBe(
      "openid profile email"
    )
    expect(
      completed.authorization.searchParams.get("code_challenge_method")
    ).toBe("S256")
    const token = fixture.tokenRequests[0]
    expect(token.get("client_id")).toBe("fixture-client")
    expect(token.get("client_secret")).toBe("fixture-client-secret")
    expect(token.get("redirect_uri")).toBe(
      `${AUTH_ORIGIN}/api/auth/oauth2/callback/voss`
    )
    const challenge = createHash("sha256")
      .update(token.get("code_verifier")!)
      .digest("base64url")
    expect(challenge).toBe(
      completed.authorization.searchParams.get("code_challenge")
    )
    const session = await fixture.auth.api.getSession({
      headers: new Headers({ cookie: completed.sessionCookie }),
    })
    expect(session?.user).toMatchObject({
      email: "student.builder@vit.edu.in",
      emailVerified: true,
      name: "Student Builder",
    })
    expect(fixture.store.user).toHaveLength(1)
    expect(fixture.store.account[0]).toMatchObject({
      providerId: "voss",
      accountId: "voss-subject",
      userId: session?.user.id,
    })
    expect(session?.user).not.toHaveProperty("role")
  })

  it("retains the same local user across repeat callbacks", async () => {
    const fixture = authFlowFixture({ idToken: true })
    const first = await fixture.callback()
    const id = fixture.store.user[0]?.id
    expect(first.response.status).toBe(302)
    expect((await fixture.callback()).response.status).toBe(302)
    expect(fixture.store.user).toHaveLength(1)
    expect(fixture.store.user[0].id).toBe(id)
    expect(fixture.store.account).toHaveLength(1)
  })

  it("links a matching verified local account without repointing its identity", async () => {
    const fixture = authFlowFixture({ existingVerified: true })
    expect((await fixture.callback()).response.status).toBe(302)
    expect(fixture.store.user).toHaveLength(1)
    expect(fixture.store.account[0].userId).toBe("existing-local-user")
  })

  it("retains the verified-local-account requirement", async () => {
    const fixture = authFlowFixture({ existingVerified: false })
    const { response } = await fixture.callback()
    expect(response.headers.get("location")).toContain("account_not_linked")
    expect(fixture.store.account).toHaveLength(0)
    expect(fixture.store.session).toHaveLength(0)
  })

  it.each([{ email_verified: false }, { email: "staff@vosslabs.org" }])(
    "denies invalid provider identity before creation or trusted linking",
    async (profile) => {
      for (const existingVerified of [undefined, true]) {
        const fixture = authFlowFixture({ profile, existingVerified })
        const { response } = await fixture.callback()
        expect(response.status).toBe(403)
        expect(await response.json()).toMatchObject({
          code: "VOSS_IDENTITY_NOT_ALLOWED",
        })
        expect(fixture.store.account).toHaveLength(0)
        expect(fixture.store.session).toHaveLength(0)
      }
    }
  )

  it.each([null, "https://other.example/api/auth"])(
    "rejects missing or mismatched issuer response before code exchange",
    async (issuer) => {
      const fixture = authFlowFixture()
      const { response } = await fixture.callback({ issuer })
      expect(response.status).toBe(302)
      expect(response.headers.get("location")).toContain(
        issuer ? "issuer_mismatch" : "issuer_missing"
      )
      expect(fixture.tokenRequests).toHaveLength(0)
      expect(fixture.store.session).toHaveLength(0)
    }
  )

  it("rejects invalid state before the token exchange", async () => {
    const fixture = authFlowFixture()
    const { response } = await fixture.callback({ wrongState: true })
    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toMatch(/state/)
    expect(fixture.tokenRequests).toHaveLength(0)
    expect(fixture.store.session).toHaveLength(0)
  })

  it("does not expose password sign-in as another authentication path", async () => {
    const fixture = authFlowFixture()
    for (const path of ["sign-up/email", "sign-in/email"]) {
      const response = await fixture.auth.handler(
        new Request(`${AUTH_ORIGIN}/api/auth/${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: AUTH_ORIGIN },
          body: JSON.stringify({
            email: "student.builder@vit.edu.in",
            name: "Student",
            password: "fixture-password",
          }),
        })
      )
      expect(response.status).not.toBe(200)
    }
    expect(fixture.store.user).toHaveLength(0)
    expect(fixture.store.session).toHaveLength(0)
    expect(fixture.fetchMock).not.toHaveBeenCalled()
  })
  it("retains ordinary session reads when the VOSS provider is unconfigured", async () => {
    const fixture = authFlowFixture({ unconfigured: true })
    expect(
      await fixture.auth.api.getSession({ headers: new Headers() })
    ).toBeNull()
    expect(fixture.fetchMock).not.toHaveBeenCalled()
    expect(fixture.store.user).toHaveLength(0)
  })
  it("invalidates the product session without contacting VAuth again", async () => {
    const fixture = authFlowFixture()
    const completed = await fixture.callback()
    const headers = new Headers({ cookie: completed.sessionCookie })
    const providerCalls = fixture.fetchMock.mock.calls.length
    await revokeProductSession(fixture.auth.api, headers)
    expect(await fixture.auth.api.getSession({ headers })).toBeNull()
    expect(fixture.store.session).toHaveLength(0)
    expect(fixture.fetchMock).toHaveBeenCalledTimes(providerCalls)
  })
  it.each([
    "//external.example",
    "/\\external.example",
    "https://external.example",
  ])(
    "rejects a crafted offsite callback at the installed library boundary",
    async (callbackURL) => {
      const fixture = authFlowFixture()
      const response = await fixture.auth.handler(
        new Request(`${AUTH_ORIGIN}/api/auth/sign-in/oauth2`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: AUTH_ORIGIN },
          body: JSON.stringify({ providerId: "voss", callbackURL }),
        })
      )
      expect(response.status).toBe(403)
      expect(fixture.fetchMock).not.toHaveBeenCalled()
      expect(fixture.store.session).toHaveLength(0)
    }
  )
})
