# Local development

```bash
npm install
npm run dev:setup
npm run dev
```

Open http://localhost:3000/login. The four choices are Super admin, Lead, Organizer and Student. The switcher replaces identity only; database permissions are enforced for every persona.

## Setup and connection roles

`dev:setup` copies `.env.development.example` when `.env.local` is absent, checks each configured PostgreSQL target, starts Docker PostgreSQL on port 5434, then runs provisioning, real ordered migrations, principal verification and local fixture loading. The shared guard rejects routing query overrides, requires an explicit database and checks node-postgres's effective host, database and port without connecting. Shell variables take precedence and are checked independently. It never pushes the current schema or marks unapplied migrations as applied.

- `DATABASE_URL`: restricted `vboard_app`, used by `withDb` for domain transactions.
- `AUTH_DATABASE_URL`: bounded `vboard_auth`, used only by Better Auth and guarded local identity lookup.
- `DIRECT_URL`: administrative connection used by migration, provisioning and fixture scripts.
- `VBOARD_APP_PASSWORD` and `VBOARD_AUTH_PASSWORD`: provisioning passwords matching those runtime URLs.
- `SUPER_ADMIN_EMAILS`: canonical allowlist synchronized into private SQL configuration by provisioning.

Run `npm run db:provision` again after changing configured Super admin emails. Merely changing the environment does not change existing SQL authority. Missing runtime credentials fail closed. All connections use node-postgres, including Neon TCP/TLS connections.

## Schema changes and migrations

Drizzle metadata tracks the final declared tables, policies and checks. At the current schema, `npm run db:generate` produces no changes. Future schema changes append migrations numbered `0009` onward; review their SQL together with any required security functions, triggers and grants.

The custom checksum runner remains authoritative: use `npm run db:migrate` to apply SQL and `npm run db:migrate:status` to inspect the ledger. Do not use Drizzle's migrate command, schema push, or baseline marking for setup. Drizzle metadata supports generation; it does not replace the ordered security migrations or checksum ledger.

## Personas and scope

| Persona | Email | Authority |
| --- | --- | --- |
| Super admin | harshal.more@vit.edu.in | Platform administration and assigning/changing/removing Leads |
| Lead | aarav.mehta@vit.edu.in | GDG: Organizer operations, team management and settings |
| Organizer | sneha.iyer@vit.edu.in | Coding Club: posts, events, registration decisions, attendance and attendee export |
| Student | priya.nair@vit.edu.in | Own profile, registration/cancellation and history |

Fixture loading verifies that the Super admin persona email is already provisioned in the SQL allowlist before it rewrites any data. GDG and Coding Club assignments are separate isolation fixtures. An inactive assignment or community confers no committee access. Lead inherits Organizer operations, and can appoint only Organizers. Only Super admin can change a Lead.

## Existing local data

Use provisioning and `npm run db:migrate` to upgrade an existing database without reseeding. Migrations preserve content, registrations and historical authority provenance. The retired roles and extensions are archived privately; no retired assignment gains new authority.

`npm run dev:seed` intentionally wipes community/post/registration/audit demo data and reloads fixtures. It requires `DIRECT_URL` on a loopback PostgreSQL host and an administrative local principal. Fixture loading runs in one transaction with triggers disabled transaction-locally, retains schema constraints, validates references, and rolls back on failure. This privileged script is never imported by the application.

`npm run dev:up` and `npm run dev:down` start/stop Docker while retaining data. `npm run dev:reset` destroys the local container volume and runs fresh setup.

## Verification

Run `npm run check` before handing off code. `npm run db:verify` checks configured runtime principals; `npm run test:db` creates and removes separate loopback databases with the `vboard_test_` prefix to test fresh/legacy migrations and security. The integration harness requires local `DIRECT_URL` plus `VBOARD_APP_PASSWORD` and `VBOARD_AUTH_PASSWORD`, and uses separate restricted connections. A dev-persona journey proves the local domain path, not a real VOSS exchange or remote deployment.

## Production configuration

The `production-database` GitHub environment supplies the secrets used by `.github/workflows/deploy.yml`:

| Secret | Purpose |
| --- | --- |
| `PRODUCTION_DIRECT_URL` | Administrative provisioning and migration connection |
| `PRODUCTION_DATABASE_URL` | Restricted `vboard_app` runtime connection |
| `PRODUCTION_AUTH_DATABASE_URL` | Bounded `vboard_auth` connection |
| `PRODUCTION_APP_PASSWORD` | Provisioned password matching the application URL |
| `PRODUCTION_AUTH_PASSWORD` | Provisioned password matching the auth URL |
| `PRODUCTION_SUPER_ADMIN_EMAILS` | Canonical SQL allowlist synchronized by provisioning |
| `VERCEL_DEPLOY_HOOK_URL` | Deployment hook invoked after database checks |

The workflow provisions, migrates and verifies before invoking the hook when all required configuration is present. Configure the same runtime database URLs, auth/VOSS settings and canonical allowlist in the deployed application environment; keep administrative credentials confined to migration/provisioning infrastructure. The local verification evidence does not establish that these production secrets exist or that a remote deployment or real VOSS exchange has succeeded.
