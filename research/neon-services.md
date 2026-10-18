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

`pg` and `withDb` already provide the interactive transaction needed for actor context, dependent queries and same-transaction audit. The restricted application and auth principals remain mandatory on Neon; owner URLs pulled by the CLI cannot become runtime URLs. `DIRECT_URL` remains administrative only.

Community settings already accepts `logoUrl`, but no upload exists and public community views currently show initials. Reuse that exact flow for a public branding image. Existing external HTTP(S) logo URLs remain usable. This does not add post attachments, student uploads or private-file storage.

## Accepted integration

Declare a `vboard-assets` bucket with `public_read`. A settings capability check precedes storage I/O. Validate a maximum 2 MiB file, accepted MIME type and PNG/JPEG/WebP signature on the server. Generate an immutable UUID key beneath the authorized community ID; never use a client filename or client community ID.

Persist a `neon://<bucket>/<key>` reference in the existing `logoUrl` column. Resolve it on the server through the current branch's storage endpoint when rendering. Manual external URLs are limited to HTTP(S); a submitted `neon:` pointer cannot select another community's stored object. No schema migration is needed.

Upload before the existing authorized SQL update, which owns RLS and audit. If the SQL update fails, delete only the newly created object. Existing images remain preserved. These two services do not share an atomic commit; abrupt process loss can leave an unreferenced object, and cleanup failure must be recorded without secrets.

The Next.js action body limit is 3 MiB, allowing multipart overhead around the 2 MiB file limit. Public image bytes may be read anonymously; student records and private uploads must never enter this bucket.

## Acceptance

Run focused action/validation/storage tests and the application check/build. Remote acceptance additionally requires the actual branch/region, bucket access level, restricted PostgreSQL principal/security checks, a persisted application write/read, and a real app logo upload/save/reload/image read. CLI init or a successful build alone does not establish remote service acceptance.
