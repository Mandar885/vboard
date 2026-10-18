# vboard UI/UX Specification

Status: Shared shadcn design system, redesigned on 2026-10-18.
Source of truth for tokens: `src/app/globals.css`. The original design remains frozen in `docs/design/`.

## Character

vboard helps students find community activity and register once, then gives community teams a compact workspace for running it. Public discovery uses top navigation; personal, community and site administration use a sidebar. Both consume the same semantic theme, components, typography and state language.

Use neutral canvases, flat bordered cards and restrained orange identity and focus. Lead with the event or task, its status and the next permitted action. Ordinary labels and reading text use sentence case and Geist. Reserve Geist Mono for identifiers and numeric data.

## Theme

Components consume semantic Tailwind tokens. Do not place raw colours in page or component markup. Light and dark values live in `globals.css`; changing the theme must preserve control visibility, status readability and keyboard focus.

| Semantic token | Purpose |
| --- | --- |
| `background`, `foreground` | Neutral canvas and primary text |
| `card`, `card-foreground` | Bordered content surfaces |
| `popover`, `popover-foreground` | Menus and floating controls |
| `primary`, `primary-foreground` | Primary action |
| `secondary`, `muted`, `accent` | Supporting fills and interaction states |
| `muted-foreground` | Descriptions, metadata and supporting labels |
| `border`, `input` | Surface and control boundaries |
| `brand`, `ring` | Identity, current destination and focus |
| `success`, `warning`, `destructive` | Text-labelled workflow states |
| `sidebar-*` | Workspace navigation surfaces, text, selection and focus |

The light baseline is a near-white canvas, white cards, neutral ink and a burnt-orange accent. Dark mode uses near-black surfaces, light text and an orange accent adjusted for the dark canvas. Dark mode is class-based through `next-themes`, defaulting to the system preference.

Colour never carries state alone. Include readable state words or a meaningful icon with accessible text. Orange is selective emphasis rather than a fill for every card.

## Typography, shape and spacing

- Retain Geist and Geist Mono from `next/font`, with a 16px root size and readable line height.
- Workspace headings are 24px semibold. Public headings are restrained at 30–36px; descriptions have a readable measure.
- Workspace reading text is normally 14px, public prose 16px and supporting labels 12px where appropriate.
- Use one token-derived radius scale with an 8px base. Cards remain flat and bordered; avoid decorative shadows and gradients.
- Align shell headers and page content to 16px mobile and 24px desktop gutters. Use 16–24px section gaps and consistent card padding.
- Stack content on mobile; add columns when fields, metadata and actions stay readable.
- Keep motion minimal. Honour `prefers-reduced-motion` and visible `:focus-visible` styling.

## Shared compositions

Use installed shadcn `base-nova` components with Base UI APIs. Owned primitives live in `src/components/ui/`; reuse Card, Button, Badge, Field, Table, Sheet, Sidebar, AlertDialog and Skeleton before creating another component.

`PageHeader` is a Server Component-safe title, optional description/eyebrow and action region. Public and workspace pages share it; `dashboard/ui.tsx` reexports it to preserve workspace imports. Eyebrows are optional small sentence-case context.

`EmptyState` provides an optional icon, title, body and relevant action. Distinguish an empty source from a filter with no matches. Do not add controls for unavailable features.

Workspace `SectionCards`, `StatCard` and `Panel` compose real summary values and task lists. `RoleBadge` and `StatusBadge` keep a consistent text vocabulary. Counts and links must describe existing data and reachable destinations.

## Public shell

Desktop navigation exposes Discover, Calendar and Communities, theme access and sign-in or workspace/account access. The mobile Sheet exposes the same destinations and closes after selection. Indicate the current route without relying on colour alone.

Public pages use a centered readable container. Footer links share the same type and spacing vocabulary. Direct event and community links remain shareable.

### Discovery and communities

Discover opens with a compact introduction and the real mixed feed, preserving existing pinned/chronological order and filtering. Post cards show community identity, event or announcement type, title, concise body and relevant facts. Event actions describe current registration without inventing eligibility or availability.

The communities directory uses identity cards with readable names and descriptions. Community detail names the community, shows existing team information and its feed, and exposes management only when permitted.

### Calendar

Compose the existing month calendar and selected-day list as matching card surfaces, stacked on narrow screens. Event indicators accompany readable date selection. The selected-day list uses the same post cards and empty state as discovery.

Group and format dates using existing `Asia/Kolkata` helpers. Map query results to a minimal presentation object on the server before passing data to the client calendar. Approval-gated location values must be `null` in serialized props; hidden rendered text is insufficient.

### Detail and registration

Lead with title, community, type/status and author. Group date, location and capacity facts in a readable section beside or above the main content. Use comfortable prose width.

Registration shows existing state and the next permitted action: sign in, register, request, cancel or the relevant unavailable explanation. Preserve approval, capacity, timing, cancellation and location rules. Keep mobile actions reachable without covering event content.

### VOSS entry

Sign-in is a focused VOSS-only composition. Explain the VIT identity requirement and preserve error mapping, return path and signup redirect. The persona switcher remains guarded for local development. There are no password fields or new account flows.

## Workspace shell

Use existing SidebarProvider, Sidebar and inset structure. Keep capability-filtered destinations, account controls, desktop collapse and mobile Sheet. Only the longest matching destination is active.

The contextual header names the current community or event when available. Collapse ancestor crumbs on narrow screens while keeping the task readable. Every breadcrumb destination must exist; the posts collection has no standalone route.

Page headers use task-focused names with available actions near the task. Personal overview, community work and administration share visual and interaction patterns.

### Overview

Show real role-relevant counts and compact work panels. Bound pending-decision previews and link to the existing resolving screen. Keep useful next tasks visible without an unbounded list dominating the overview.

### Lists and attendance

Align search/filter controls, result counts and actions in a consistent toolbar. Preserve server filtering and result limits; label limited results honestly. A local filter must not imply it searches records the server did not return.

Desktop tables keep clear identity, metadata, state and action columns. On mobile, registrations, events, attendees and administrative records use stacked layouts with the same actions. Bound any remaining wide table inside its own scroll region; the page itself must not overflow.

Attendance retains stable selection IDs, select-all semantics, status counts, capability-aware decisions/check-in and current CSV export. Selection and bulk pending feedback stay explicit. No drag ordering, saved views or generic table framework is introduced.

### Authoring and settings

Group existing post fields into content, event details and registration/visibility settings. Use Field labels/descriptions, full-width mobile controls and a stable action footer. Keep profile, team and settings consistent with those sections.

Every input has an associated label. Preserve boundary validation, authorization, auditing and route-local Server Actions. Long forms show a durable accessible error and retain entered values after handled failures. Disable repeated submissions and show pending text/spinner.

Destructive changes use AlertDialog with an explicit action verb and impact description, preserving the enclosing form contract. Success remains visible through existing feedback and updated state.

### Administration

Communities, People and Audit share identity, toolbar, status, result and empty-state patterns with community tools. Preserve server scope/search, role actions, archive behavior and audit semantics. This redesign does not complete partially implemented access workflows.

## States and accessibility

- Cover default, empty, searchable no-results, loading/pending, handled error and success where the workflow supports them.
- Loading skeletons resemble actual content. Keep workspace errors within its shell where possible.
- Error/not-found pages offer a working recovery link or retry action; no unconfigured reporting control.
- Preserve keyboard navigation, visible focus, labels and accessible control names. Give mobile critical controls comfortable touch targets.
- Menus/dialogs support keyboard dismissal and focus return. Navigation works without hover.
- Use semantic headings, lists, tables and buttons. Avoid conflicting nested interactive controls in cards.

## Preservation and verification

Preserve routes, authentication, schema, migrations, domain policies, capabilities, Server Components, domain queries and route-local Server Actions. New product features, notifications, charts and production changes are outside this work.

Run `npm run check` after integration. Add focused regression coverage for changed behavior, especially calendar serialization. Inspect representative student, organizer, volunteer and admin journeys at 360px, 768px and 1440px in both themes. Check mobile navigation, registration actions/status, authoring, selection/confirmation, keyboard focus, long labels and page overflow.

Pre-existing backend concerns remain separate: per-event/co-host scope isolation, incomplete access workflows and incremental migration safety. Visual verification is not a security audit or production-readiness certification.
