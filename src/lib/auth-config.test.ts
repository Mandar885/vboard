import { describe, expect, it } from "vitest"
import {
  authOptions,
  isVerifiedVitIdentity,
  mapVossProfile,
  vossProvider,
  VOSS_DISCOVERY_URL,
  VOSS_ISSUER,
} from "@/lib/auth-config"

const configured = {
  VOSS_DISCOVERY_URL,
  VOSS_CLIENT_ID: "fixture-client",
  VOSS_CLIENT_SECRET: "fixture-secret",
}

describe("VOSS provider configuration", () => {
  it.each([{}, { VOSS_DISCOVERY_URL }, { ...configured, VOSS_CLIENT_ID: "" }])(
    "keeps missing or partial credentials unavailable",
    (environment) => {
      expect(vossProvider(environment)).toBeNull()
      expect(authOptions(environment).plugins).toHaveLength(1)
    }
  )

  it("rejects a different or malformed discovery endpoint", () => {
    for (const url of [
      "invalid",
      "https://other.example/discovery",
      `${VOSS_DISCOVERY_URL}?extra=1`,
    ]) {
      expect(
        vossProvider({ ...configured, VOSS_DISCOVERY_URL: url })
      ).toBeNull()
    }
  })

  it("uses the guide's strict code-exchange settings", () => {
    expect(vossProvider(configured)).toMatchObject({
      providerId: "voss",
      issuer: VOSS_ISSUER,
      discoveryUrl: VOSS_DISCOVERY_URL,
      authentication: "post",
      scopes: ["openid", "profile", "email"],
      pkce: true,
      requireIssuerValidation: true,
    })
    const options = authOptions(configured)
    expect(options.emailAndPassword.enabled).toBe(false)
    expect(options.account.accountLinking).toMatchObject({
      trustedProviders: ["voss"],
      allowDifferentEmails: false,
      requireLocalEmailVerified: true,
    })
  })
})

describe("verified VIT identity boundary", () => {
  it("normalizes identity and supplies an optional-name fallback without authority", () => {
    expect(
      mapVossProfile({
        sub: "provider-subject",
        email: " Aarav.Mehta@vit.edu.in ",
        email_verified: true,
        name: " ",
        role: "super_admin",
        userId: "someone-else",
      })
    ).toEqual({
      email: "aarav.mehta@vit.edu.in",
      emailVerified: true,
      name: "Aarav Mehta",
    })
  })

  it.each([
    { email: "student@vit.edu.in", email_verified: false },
    { email: "student@vit.edu.in", email_verified: "true" },
    { email: "student@vit.edu.in" },
    { email: "student@vit.edu.in", emailVerified: true, email_verified: false },
    { email: "staff@vosslabs.org", email_verified: true },
    { email: "bad@@vit.edu.in", email_verified: true },
    { email: null, email_verified: true },
  ])(
    "rejects nonverified or non-VIT identities before account linking",
    (profile) => {
      expect(() => mapVossProfile(profile)).toThrow(/verified @vit.edu.in/)
    }
  )

  it("rechecks both claims when creating a local account", async () => {
    const before = authOptions(configured).databaseHooks.user.create.before
    const user = {
      id: "local-id",
      name: "Student",
      email: "student@vit.edu.in",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(await before(user)).toBe(false)
    expect(await before({ ...user, emailVerified: true })).toEqual({
      data: { ...user, emailVerified: true },
    })
    expect(
      isVerifiedVitIdentity({ email: user.email, emailVerified: true })
    ).toBe(true)
    expect(
      isVerifiedVitIdentity({ email: user.email, emailVerified: "true" })
    ).toBe(false)
  })
})
