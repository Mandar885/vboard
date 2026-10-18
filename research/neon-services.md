# Neon service integration

Date: 2026-10-18. Scope: the existing Neon project and production branch supplied by Boss, PostgreSQL and Object Storage only.

## Verified references

- [Object Storage quickstart](https://neon.com/docs/storage/get-started): `neon.ts` declares buckets; deploy provisions them and pulls `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3` and `AWS_REGION`.
- [Buckets](https://neon.com/docs/storage/buckets): `public_read` permits anonymous reads and authenticated writes; object URLs use path-style addressing. Buckets and objects branch with the database.
- [Authentication](https://neon.com/docs/storage/authentication): S3 clients require `forcePathStyle: true`; storage credentials stay on the server and are branch-scoped.
- [Objects](https://neon.com/docs/storage/objects): immutable keys avoid stale cached versions. Uploads can set content type and cache headers.
- Installed `neon`, `neon-postgres` and `neon-object-storage` skills: retain existing drivers/authentication, use a direct connection for migrations, and store an object key so a cloned row resolves through its current branch endpoint.

Storage is supported in AWS Ohio, N. Virginia, Frankfurt and Singapore. The supplied project's actual region and remote privileges must be inspected before provisioning. Neon does not host this Next.js frontend.

## Existing application

`pg` and `withDb` provide the interactive transaction needed for actor context, dependent queries and same-transaction audit. Boss selected one restricted `vboard_app` principal and one `DATABASE_URL` for both domain transactions and local Better Auth tables. Owner URLs pulled by the CLI cannot become runtime URLs. `DIRECT_URL` remains administrative only.

Community settings already accepts `logoUrl`, but no upload exists and public community views currently show initials. Reuse that exact flow for a public branding image. Existing external HTTP(S) logo URLs remain usable. This does not add post attachments, student uploads or private-file storage.

## Accepted integration

Declare a `vboard-assets` bucket with `public_read`. A settings capability check precedes storage I/O. Validate a maximum 2 MiB file, accepted MIME type and PNG/JPEG/WebP signature on the server. Generate an immutable UUID key beneath the authorized community ID; never use a client filename or client community ID.

Persist a `neon://<bucket>/<key>` reference in the existing `logoUrl` column. Resolve it on the server through the current branch's storage endpoint when rendering. Manual external URLs are limited to HTTP(S); a submitted `neon:` pointer cannot select another community's stored object. No schema migration is needed.

Upload before the existing authorized SQL update, which owns RLS and audit. If the SQL update fails, delete only the newly created object. Existing images remain preserved. These two services do not share an atomic commit; abrupt process loss can leave an unreferenced object, and cleanup failure must be recorded without secrets.

The Next.js action body limit is 3 MiB, allowing multipart overhead around the 2 MiB file limit. Public image bytes may be read anonymously; student records and private uploads must never enter this bucket.

## Acceptance

Run focused action/validation/storage tests and the application check/build. Remote acceptance additionally requires the actual branch/region, bucket access level, restricted PostgreSQL principal/security checks, a persisted application write/read, and a real app logo upload/save/reload/image read. CLI init or a successful build alone does not establish remote service acceptance.

## Managed administrative provisioning

The actual Neon failure occurred on an unconditional `ALTER ROLE ... NOSUPERUSER ...` statement, after SQL role creation succeeded. [PostgreSQL ALTER ROLE](https://www.postgresql.org/docs/18/sql-alterrole.html) requires superuser authority to change the SUPERUSER attribute, including requesting NOSUPERUSER on an already restricted role. The provisioner now inspects role attributes, refuses existing superuser/replication/BYPASSRLS roles, changes only supported creation attributes when needed, removes inherited memberships and rechecks restrictions.

[Neon role documentation](https://neon.com/docs/manage/roles) confirms that SQL-created roles are restricted while Console/API/CLI-created roles receive `neon_superuser`. Runtime roles continue to be created with SQL. [PostgreSQL ALTER FUNCTION](https://www.postgresql.org/docs/18/sql-alterfunction.html) requires the migration owner to be able to SET ROLE to the new owner and the new owner to have schema CREATE when transferring ownership. Only the administrative owner receives helper membership; the migration runner grants helper schema CREATE inside each relevant file transaction and revokes it before checksum recording/commit. The existing SQL and runtime principal/RLS verifier remain unchanged.

On 2026-10-18, an isolated disposable PostgreSQL 16 instance passed actual provisioning/repeat, parent-membership cleanup, CREATEDB/CREATEROLE reduction, guard LOGIN removal and rejection of an existing BYPASSRLS role under a non-superuser CREATEROLE owner without BYPASSRLS. After the single-URL change, all ten migrations and their repeat passed. Runtime principal verification passed, every API function belonged to the restricted helper, the helper had no CREATE on public/private/API schemas and a restricted public community read succeeded. The full 197-test unit/auth-mock suite and separate fresh/legacy migration, preservation, authorization, concurrency and runtime suites passed. The temporary databases, roles and container were removed; the existing local cluster was not modified.

## One runtime URL and privilege matrix

VAuth's client guide uses Better Auth's local database adapter in the product database; a second credential is optional isolation rather than an IdP requirement. Boss explicitly chose one `DATABASE_URL`. The guarded auth module and domain transaction module both verify the same restricted `vboard_app` identity. No password-derived URL or privileged fallback is used.

| Data/operation                                          | Current access                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Better Auth user/session/account/verification           | Shared trusted app credential CRUD, guarded adapter/import boundary, verified-VIT session checks              |
| Domain profile/community/member/post/registration/audit | Same credential with trusted actor context, FORCE RLS, checked privacy projections and mutation/audit guards  |
| Private allowlist/legacy archive                        | No runtime schema/table access                                                                                |
| Provisioning/migration                                  | Administrative DIRECT_URL only; helper ownership uses restricted NOLOGIN guard and transient migration CREATE |

This intentionally removes credential-level isolation between auth and domain server code. The shared credential can read or modify auth identities/sessions and must remain server-only. It cannot bypass domain RLS, read the private allowlist/archive, inherit another role or create schema objects. Public/student/operator domain PII still follows the existing approved projections and actor checks.

Incremental `0009_single_runtime_principal.sql` grants the four auth tables' CRUD to `vboard_app`, revokes those grants from the compatibility `vboard_auth` role and makes that role NOLOGIN without dropping records. Provisioning no longer needs an auth password, and application/deployment configuration no longer needs an auth URL. Historical SQL `0000`–`0008` remains unchanged.

Root provisioned the actual Neon target and applied all ten migrations. `npm run db:verify` passed, and the migration checker confirmed all ten checksums match the repository. `npm run check` passed 197 tests across 25 files plus typecheck/lint/format; the production build passed using synthetic database settings without an auth-specific URL. The running local production app then returned HTTP 200 for `/`, `/communities`, `/calendar`, `/login` and `/api/auth/get-session` against Neon with only the restricted runtime URL. No production seed/reset or real VOSS exchange was performed. The deployed Vercel source/environment and Object Storage acceptance remain pending.
