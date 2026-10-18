import type { BetterAuthOptions } from "better-auth"
import { APIError } from "better-auth/api"
import { genericOAuth } from "better-auth/plugins"
import type { GenericOAuthConfig } from "better-auth/plugins/generic-oauth"
import { z } from "zod"
import {
  deriveNameFromEmail,
  isCollegeEmail,
  normalizeEmail,
} from "@/lib/identity"

export const VOSS_ISSUER = "https://accounts.vosslabs.org/api/auth"
export const VOSS_DISCOVERY_URL = `${VOSS_ISSUER}/.well-known/openid-configuration`
export const VOSS_UNAVAILABLE = "VOSS sign-in is currently unavailable."
const emailSchema = z.email().refine(isCollegeEmail)
type AuthEnvironment = Readonly<Record<string, string | undefined>>

export function isVerifiedVitIdentity(identity: {
  email?: unknown
  emailVerified?: unknown
}): boolean {
  return (
    identity.emailVerified === true &&
    typeof identity.email === "string" &&
    emailSchema.safeParse(normalizeEmail(identity.email)).success
  )
}

export function mapVossProfile(profile: Record<string, unknown>) {
  const verified = [profile.emailVerified, profile.email_verified].filter(
    (value) => value !== undefined
  )
  const email =
    typeof profile.email === "string" ? normalizeEmail(profile.email) : ""
  if (
    !verified.length ||
    verified.some((value) => value !== true) ||
    !isVerifiedVitIdentity({ email, emailVerified: true })
  ) {
    throw new APIError("FORBIDDEN", {
      code: "VOSS_IDENTITY_NOT_ALLOWED",
      message: "Sign in with a verified @vit.edu.in account.",
    })
  }
  return {
    email,
    emailVerified: true,
    name:
      (typeof profile.name === "string" && profile.name.trim()) ||
      deriveNameFromEmail(email),
  }
}

export function vossProvider(
  environment: AuthEnvironment = process.env
): GenericOAuthConfig | null {
  const discoveryUrl = environment.VOSS_DISCOVERY_URL?.trim()
  const clientId = environment.VOSS_CLIENT_ID?.trim()
  const clientSecret = environment.VOSS_CLIENT_SECRET?.trim()
  if (discoveryUrl !== VOSS_DISCOVERY_URL || !clientId || !clientSecret)
    return null
  return {
    providerId: "voss",
    issuer: VOSS_ISSUER,
    discoveryUrl,
    clientId,
    clientSecret,
    authentication: "post",
    scopes: ["openid", "profile", "email"],
    pkce: true,
    requireIssuerValidation: true,
    mapProfileToUser: mapVossProfile,
  }
}

export function authOptions(environment: AuthEnvironment = process.env) {
  const provider = vossProvider(environment)
  return {
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    emailAndPassword: { enabled: false },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["voss"],
        allowDifferentEmails: false,
        requireLocalEmailVerified: true,
      },
    },
    plugins: [genericOAuth({ config: provider ? [provider] : [] })],
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!isVerifiedVitIdentity(user)) return false
            return { data: user }
          },
        },
      },
    },
  } satisfies BetterAuthOptions
}
