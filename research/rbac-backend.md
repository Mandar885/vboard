# Four-role backend implementation research

2026-10-18. Boss authorized replacing the old permission backend with Super admin, committee Lead, committee Organizer and Student. Lead inherits organizer operations. Existing UI work and application data must be preserved.

The original separate auth-credential proposal below was superseded by Boss's explicit single-URL decision. Current implementation uses restricted `vboard_app` for both domain transactions and local Better Auth tables; the adapter/import boundary protects auth access within the trusted server. See [the current privilege matrix](./neon-services.md#one-runtime-url-and-privilege-matrix).

## Verified reference

VERP actual schema/domain-query conventions are documented in .preset/VERP_BACKEND_REFERENCE.md. It has no implemented RLS; proposed RLS in its architecture research is deferred. Reuse one schema/query file per domain, schema-derived boundary validation, capability checks separate from resource ownership, real-user dev personas and soft-delete patterns. Do not copy its Neon HTTP database type cast, lack of interactive transactions, or separate domain-write/audit calls.

## Database enforcement findings

PostgreSQL row security is disabled by default. Enabling RLS with no applicable policy is default-deny; owners normally bypass policies and superusers/BYPASSRLS always do, even with FORCE RLS. SQL grants are still required; RLS does not constrain TRUNCATE. Runtime access must therefore use a verified restricted role, separate from migration/administration credentials. Relevant docs: https://www.postgresql.org/docs/current/ddl-rowsecurity.html .

Transaction-local identity must be set and queried on the same checked-out connection. Use parameterized set_config with transaction-local lifetime and never derive actor/super-admin claims from form fields. Ensure state disappears after both commit and rollback, and test concurrent requests through a small reused pool. node-postgres transaction docs: https://node-postgres.com/features/transactions ; PostgreSQL configuration functions: https://www.postgresql.org/docs/17/functions-admin.html .

Drizzle supports PostgreSQL policies and roles, but currently published docs include1.0 APIs while the installed dependency is0.45.1. Check installed types before using pgTable enableRLS/pgPolicy/pgRole, and derive transaction types honestly from the selected adapter rather than casting node-postgres as neon-http. Official docs: https://orm.drizzle.team/docs/rls , https://orm.drizzle.team/docs/transactions , https://orm.drizzle.team/docs/connect-neon . Neon HTTP is not interchangeable with an interactive transaction-capable driver.

## Important contracts for architecture

- Capability checks and RLS must agree on community scope, active membership and inactive/archived communities. No co-host or override fallback remains.
- Students must not approve their own requests, alter another registration/profile, escalate membership, move posts between committees or read other attendees' private data. Verify denied raw SQL as the runtime role, not just UI hiding.
- Registration windows, eligibility, state transitions and capacity need correct atomic handling; concurrent direct registration and organizer approvals must not overbook. Bulk payloads containing any out-of-scope ID must reject wholly.
- Domain mutation and privileged audit insertion must use the same transaction. Test rollback if either part fails.
- Public counts must stay correct without disclosing individual attendees. Public author display must not accidentally grant private auth/account/session access. Approval-gated locations must stay redacted at the public presentation boundary.
- Better Auth needs a separate bounded database access path. Application runtime must have no access to credential/session tables or migration archives.
- Leads manage organizers only; only Super admin assigns leads. Retired roles must not silently acquire new organizer authority. Preserve history and records, and explicitly inventory/handle retired extension rows.
- Schema shape and policies should be declarative in Drizzle where supported; hand-reviewed SQL covers roles, functions, triggers and migration sequencing. Database-managed timestamps and immutable resource ownership complement policy predicates.

## Local evidence and test target

Local PostgreSQL16 at localhost5434. Original runtime principal vboard is superuser/BYPASSRLS and0policies exist. Local extension tables are empty; memberships5lead5manager8volunteer, profiles99student1admin,19posts370registrations. No SQL migrations exist/applied. A private pg_dump backup exists at /private/tmp/vboard-before-rbac.sql; full code baseline before RBAC is /private/tmp/vboard-rbac-baseline (no environment secrets copied).

Test fresh installation and an incremental upgrade from the actual legacy schema, repeat migration without drift, same-transaction audit, role revocation, forged scopes/IDs, missing context, pooled identity isolation, public privacy and concurrent capacity. Keep browser personas on exactly the same authorization/RLS path as VOSS sessions. No remote production target is identified yet; local live app is the verified test target.
