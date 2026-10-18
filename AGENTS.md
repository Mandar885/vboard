# vboard — Project Instructions

vboard is the events + community platform for VIT (Vidyalankar Institute of Technology, Mumbai), under voss-labs. Sister project to [verp](https://github.com/voss-labs/verp), and built on the same framework and project structure.

The product wedge: replace per-event Google Forms with unified one-click registration.

For the full plan, read `research/plan.md`. For deferred features, read `research/future.md`. Don't pollute the plan with future ideas.

CLAUDE.md is symlinked to this file — same content applies to all coding agents.

## Stack

- Next.js 16 App Router (React 19) — Server Components, Server Actions, route handlers
- TypeScript strict, ESLint (`eslint-config-next`) + Prettier (with the Tailwind plugin)
- Drizzle ORM + PostgreSQL on Neon (node-postgres against a local Docker database)
- Better Auth as an OIDC client of VOSS (accounts.vosslabs.org, the voss-labs/vauth repo) — no passwords
- Tailwind 4 + shadcn (base-nova style, Base UI primitives)
- Vitest for pure-logic unit tests
- Vercel for deploy, GitHub Actions for CI and production migrations
- npm

## Commands

- `npm run dev` — dev server on port 3000
- `npm run check` — typecheck, lint, format check, tests (run before commit)
- `npm run fix` — autofix lint and formatting
- `npm test` — Vitest
- `npm run dev:up` / `npm run dev:down` — local Postgres in Docker
- `npm run db:generate` — generate a migration from schema changes
- Apply numbered SQL migrations locally too; schema push does not install the security model
- `npm run db:migrate` — run pending SQL migrations (production)
- `npm run dev:seed` — wipe and seed the local database with communities, events and one persona per role
- `npx shadcn@latest add <component>` — install a shadcn component on demand

## Layout

- `src/app/` — routes (App Router); `globals.css` holds the design tokens
- `src/components/` — app components; `src/components/ui/` — vendored shadcn primitives
- `src/db/schema/<domain>.ts` — Drizzle tables, reexported via `src/db/schema/index.ts`
- `src/db/queries/<domain>.ts` — async functions returning plain objects
- `src/db/migrations/` — hand-reviewed SQL migrations, applied by `src/db/migrate.ts`
- `src/lib/` — auth, session, RBAC, formatting and other pure helpers (`*.test.ts` beside them)
- `src/components/ui/` — shadcn (base-nova) components; the dashboard is built only from these and shadcn blocks
- `docs/` — product and UI/UX spec; `docs/design/` is the frozen snapshot of the original design
- `research/` — plan, future work, and investigations

## Conventions

- Validation: Zod at every server boundary
- Imports: `@/` alias (mapped to `src/`), never relative
- Formatting: Prettier (2 spaces, double quotes, no semicolons)
- File size: 200–400 lines max per file; split when bigger
- shadcn components installed on demand, not preinstalled
- Styling follows `docs/UI_UX_SPEC.md`: use the tokens and primitives in `globals.css`, not raw colours

## Identity & RBAC

- Sign-in is VOSS only. VOSS verifies the `@vit.edu.in` mailbox; vboard stores no passwords and re-checks the domain on user creation
- Local dev uses the seeded persona switcher (`VBOARD_DEV_AUTH=1`); it bypasses authentication only, never authorization
- Four roles: Super admin (private SQL allowlist provisioned from `SUPER_ADMIN_EMAILS`), Lead, Organizer and Student; visitor is unauthenticated. Community roles are `lead` / `organizer`, scoped to active assignments in active communities. Lead inherits Organizer and delegates only Organizer.
- Capabilities live in `src/lib/rbac.ts`; check them with `requireCommunityAccess` / `actionCommunityAccess` / `requireSiteCapability`, never by comparing role strings in pages
- Every domain mutation owns `createAuditLog(ctx, ...)` in its `withDb` transaction; actions never duplicate audit writes. Read `.Codex/rules/database-security.md` before database/auth changes.
- Full matrix and roadmap: `research/rbac.md`

## Schema notes

- `post` is unified: text announcements OR events (when `isEvent = true`, event fields populated)
- `registration` only valid for posts where `isEvent = true`
- Owned domain IDs are UUID; Better Auth user IDs and their foreign keys remain text. rollNumber is text (trust-on-signup, no list validation in v1)
- Better Auth manages `user` / `session` / `account` / `verification` tables; we own everything else

## When adding code

- Follow verp's patterns for the data layer, routes, and components — the framework is the same
- Don't preinstall shadcn components or add features beyond what the plan specifies
- If a feature isn't in the plan, it goes in `research/future.md`, not into the codebase
- No emojis anywhere — code, comments, commits, docs
- One-line comments only when the WHY is non-obvious; never narrate the WHAT
