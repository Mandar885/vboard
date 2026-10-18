# Signing in with VOSS

vboard follows [VAuth's integration guide](https://github.com/voss-labs/vauth/blob/main/INTEGRATING.md) using the installed Better Auth 1.6.23 generic OAuth client. VAuth answers who a person is; vboard's PostgreSQL assignments and private allowlist determine what that person can do.

## Sign-in and identity

The login button starts authorization code flow with S256 PKCE and `openid profile email`. The provider exchanges the code using `client_secret_post`; the callback is `/api/auth/oauth2/callback/voss`. The configured issuer is `https://accounts.vosslabs.org/api/auth`.

Before either account creation or trusted same-email linking, vboard requires a strictly verified, valid `@vit.edu.in` email. This is deliberately narrower than VAuth's additional `@vosslabs.org` domain. Optional names fall back to a name derived from the verified email. Creation hooks and real-session resolution repeat the verified-VIT check.

The installed `requireIssuerValidation` setting validates the authorization response's `iss` parameter. It is not independent ID-token signature/JWKS verification. Token data arrives through the provider's code exchange. Public discovery and Ed25519 JWKS reachability have been checked; a live vboard token exchange remains unverified until its client is registered and privately configured.

There is no imported ERP roster in vboard. A verified VIT account participates as Student under the accepted product policy; its profile belongs to its authenticated local user ID. A submitted name or roll number never binds someone else's record. VAuth claims never grant Lead, Organizer or Super admin authority.

## Required settings

| Setting | Required behavior |
| --- | --- |
| `pkce: true` | VAuth requires S256 PKCE |
| `authentication: "post"` | Sends this product's own client credentials to the token endpoint |
| `requireIssuerValidation: true` | Requires the expected issuer response parameter |
| `mapProfileToUser` | Rejects invalid identity and supplies a nonempty name |
| `emailAndPassword.enabled: false` | VAuth is the only real authentication provider |
| `trustedProviders: ["voss"]` | Trusts this verified-mailbox provider for same-email linking |
| `allowDifferentEmails: false` | Never links different email addresses |
| `requireLocalEmailVerified: true` | Retains strict verification of an existing local account |

All current local accounts are verified. The guide's exception for unverified password-era accounts is unnecessary and is not enabled.

## Register and configure the vboard client

[research/vauth-client-registration.patch](../research/vauth-client-registration.patch) is a reviewable addition prepared against the exact current VAuth `clients.config.ts`. [The registration notes](../research/vauth-client-registration.md) contain the matching snippet. The two exact redirect URIs are:

- `http://localhost:3000/api/auth/oauth2/callback/voss`
- `https://vboard.vosslabs.org/api/auth/oauth2/callback/voss`

The production URI matches vboard's documented origin; this does not claim production activation. A VAuth maintainer reviews the configuration change, runs `npm run clients` and supplies the vboard client ID and one-time secret privately. Never reuse VERP credentials. Existing redirect URI changes require maintainer action.

Set these in the product environment, then restart the app:

```sh
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="<independent random product-session secret>"
VOSS_DISCOVERY_URL="https://accounts.vosslabs.org/api/auth/.well-known/openid-configuration"
VOSS_CLIENT_ID="<privately issued vboard client ID>"
VOSS_CLIENT_SECRET="<privately issued vboard client secret>"
```

Use the production product origin for `BETTER_AUTH_URL` in deployment. Local environment files are never deployed. With missing, partial or noncanonical provider configuration, the VOSS button is disabled with an unavailable message, and direct handshake/callback requests fail safely. Ordinary session reads and the development personas remain usable; no secret or configuration details are sent to the browser.

## Local development and sign-out

`VBOARD_DEV_AUTH=1` exposes exactly four seeded personas. It substitutes identity only; authorization still uses the same SQL/RLS path. The switcher refuses production, requires explicit opt-in, and `next.config.ts` rejects production builds with the flag present.

Return paths are limited to internal product paths. Backslashes, control characters, protocol-relative values and offsite origins are rejected by the shared sanitizer; Better Auth also checks callback origins.

Sign-out invalidates vboard's product session. It does not log the person out of VAuth globally. A bounded-auth verification or invalidation failure shows an error and does not redirect as though sign-out succeeded. A local persona without a real product-session cookie can be cleared without an auth-database call.

## Database and verification boundaries

`AUTH_DATABASE_URL` identifies bounded `vboard_auth`; auth entry points await principal verification before adapter use. `DATABASE_URL` identifies restricted `vboard_app`; `withDb` binds the trusted identity and SQL resolves current authority. `DIRECT_URL` belongs only to administrative tools. Provisioning synchronizes `SUPER_ADMIN_EMAILS` into private SQL configuration; changing the environment alone does not grant authority.

The test suite exercises actual Better Auth callbacks with a memory adapter and fully mocked discovery/token/user-info requests, with origin/CSRF checks explicitly enabled. It verifies PKCE, issuer/state rejection, identity/name handling, strict linking, repeat identity, password-off behavior and product-session sign-out. Unexpected provider fetches are rejected. These tests do not substitute for real-client verification: sign in, check the callback/session, sign out, then sign in again and confirm the same local user.
