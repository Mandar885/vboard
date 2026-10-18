# vboard VAuth client registration

Prepared against the exact `voss-labs/vauth/clients.config.ts` read on 2026-10-18. That file currently contains VERP only. The adjacent `vauth-client-registration.patch` adds one entry and leaves VERP unchanged. It has not been applied or submitted to the identity-provider repository.

```ts
{
  name: "vboard",
  description: "Campus events and community for VIT.",
  redirectUris: [
    "https://vboard.vosslabs.org/api/auth/oauth2/callback/voss",
    "http://localhost:3000/api/auth/oauth2/callback/voss",
  ],
  scopes: ["openid", "profile", "email"],
  firstParty: true,
},
```

The production URI matches the origin documented for vboard; it does not claim that production has been activated. The development URI uses Next.js port 3000, with no wildcard or trailing slash. `providerId` remains `voss` on both sides.

A VAuth maintainer reviews the configuration change and runs `npm run clients` after it is merged. The maintainer supplies that vboard client's ID and one-time secret privately. Do not reuse VERP credentials or put the new secret in this patch, a PR, an issue, research files or chat. Updating an existing client's redirect URIs requires maintainer action; the sync command only creates new clients.

Set `VOSS_DISCOVERY_URL` to the canonical discovery endpoint and privately configure `VOSS_CLIENT_ID` and `VOSS_CLIENT_SECRET` in the local/deployed environment. Set `BETTER_AUTH_URL` to the matching product origin, retain its independent `BETTER_AUTH_SECRET`, and restart the application. With either client credential missing, vboard displays unavailable VOSS sign-in and keeps local dev personas usable under the existing development locks.

Only after registration and private configuration can the live product callback, repeat login and product-session sign-out be verified. Public discovery/JWKS reachability and mocked callback tests do not prove a live token exchange.
