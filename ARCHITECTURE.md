# Architecture — Vidya Yati

This documents how the codebase is actually put together — the routing structure, the auth/session model, and the multi-tenancy enforcement mechanism. `CLAUDE.md` at the project root is the product/design brief (what to build, in what order, on what visual system); this file is about how the pieces that exist so far fit together technically. When the two overlap, `CLAUDE.md` wins on product decisions and this file should be updated to match whatever gets built.

## Stack

Next.js 15 (App Router) + React 19 + TypeScript, one codebase for the marketing site and the app. PostgreSQL via Prisma 6 (`prisma/schema.prisma`, 43 models — see "Data model" below). Tailwind 3 for styling, with design tokens as both Tailwind theme colors and CSS custom properties in `app/globals.css`. Auth is NextAuth v5 (Auth.js) with a Credentials provider (username + bcrypt password hash — not email; see "Auth and session") — no OAuth or OTP provider wired up yet, despite the phone-OTP idea floated for parents in `CLAUDE.md`. Zod is available for input validation.

For local development, Postgres runs on the machine itself via `embedded-postgres` rather than a hosted database — see "Local development database" below.

## Route structure and portal split

Three top-level route groups under `app/`:

- `app/login` — shared login page for every role (School Admin, Staff, Parent, Super Admin all authenticate through the same Credentials form; the role that comes back on the session decides where they land).
- `app/app/*` — the school portal. One route per module: `students`, `employees`, `attendance`, `exams`, `homework`, `timetable`, `fees`, `accounts`, `admissions`, `transport` (hostel lives inside it as a tab, not a separate route), `library`, `events`, `certificates`, `communication`, `reports`, `settings`, plus `dashboard`. Every module folder follows the same shape: a server-rendered `page.tsx`, an `actions.ts` for its server actions (mutations), and one or more client components for interactive pieces (e.g. `AttendanceRoster.tsx`, `ExamMarksGrid.tsx`). A handful of modules also have a `new/` subroute with its own form + page for the "create" flow (students, employees, exams, homework, events, library, admissions, transport route/room, subscription invoices).
- `app/super-admin/*` — the platform portal: `dashboard`, `schools`, `subscriptions`, `reports`, `settings`. Same page/actions/client-component pattern. `schools` is the fullest-built of these: `page.tsx` renders the directory (left half) and a per-school detail panel (right half, even 50/50 split) with inline-editable school details (`SchoolEditForm.tsx`), an inline-editable relationship manager (`RelationshipManagerField.tsx`), an append-only notes feed (`SchoolNotes.tsx`), and a module-usage bar chart (`ModuleUsageChart.tsx`) fed by the activity logging described below.
- `app/api/auth/[...nextauth]` — the NextAuth route handler.

Marketing/public content lives at the app root (`app/page.tsx`, `app/layout.tsx`); it is meant to stay visually distinct (dark/high-tech) from the app shell (light, dense), per `CLAUDE.md`.

`components/` currently holds the shared app shell: `Sidebar.tsx` plus `sidebar-config.ts`, which is the single source of truth for the nav — each `NavItem` declares its href/icon, which `StaffPermission.moduleName` it's gated behind, and which of the three portal roles can even see it (Dashboard has no module gate; Settings is School-Admin-only). Adding a module's nav entry means adding one entry here, not touching the sidebar component itself.

## Auth and session

Split across two files because Next.js middleware always runs on the Edge runtime, which can't load bcrypt or the Prisma client:

- `auth.config.ts` — the Edge-safe half: JWT session strategy, `/login` as the sign-in page, the `jwt`/`session` callbacks that carry `role`, `schoolId`, and `username` from the JWT onto `session.user`. No providers.
- `auth.ts` — extends `auth.config.ts` with the actual Credentials provider (looks up `User` by `username`, lowercased and trimmed at both write and lookup time — not email; `email` on `User` is optional and unused for login, kept only as an optional contact field — checks `status === "ACTIVE"`, verifies the bcrypt hash). On a successful login it also stamps `User.lastLoginAt` and writes a `LOGIN` `ActivityLog` row (see "Activity logging" below). This file is imported from route handlers and server components/actions — anything running in the Node runtime.
- `middleware.ts` — imports only `auth.config.ts`, not `auth.ts`, for exactly that Edge-safe reason. It gates `/app/:path*` and `/super-admin/:path*`, redirects unauthenticated requests to `/login` with a `callbackUrl`, and cross-redirects a logged-in user to the portal that matches their role (a Super Admin hitting `/app/*` gets bounced to `/super-admin/dashboard` and vice versa) so a session can never land in the wrong portal. It also stamps an `x-pathname` request header for the school portal — see "Activity logging".

A session's `user` object carries `role` (`SCHOOL_ADMIN` / `STAFF` / `PARENT` / `SUPER_ADMIN`), `schoolId` (`null` for Super Admin — the one role with no tenant), and `username`.

Default accounts (see `prisma/seed.ts`): Super Admin username is `vidyayati` (shown to users as `VIDYAYATI`); every account super admin/school admin creates (school admins, staff, parents) defaults to password `12345` with no email required — the account is set up by username alone and the user is expected to change the password after first login (via the existing "Change password" form in Settings).

## Activity logging

Two things the Super Admin's Schools detail panel needs — "is this school actually using the app" and "which modules do they use most" — are backed by the `ActivityLog` model (`type: LOGIN | PAGE_VIEW`, optional `module`, `occurredAt`), not inference from other tables:

- **Logins**: `auth.ts`'s `authorize()` writes one `LOGIN` row per successful sign-in (fire-and-forget, wrapped so a logging failure never blocks a login).
- **Page views**: `app/app/layout.tsx` wraps every school-portal request. Server Component layouts don't receive the current pathname as a prop, so `middleware.ts` stamps it onto an `x-pathname` request header (skipping Next.js `Link` prefetch requests, detected via the `next-router-prefetch` header, so hovering a nav link doesn't count as a visit) and the layout reads it back via `next/headers` and resolves it to a human label with `moduleLabelForPath()` in `components/sidebar-config.ts` (the same table that drives the sidebar, so a module's nav entry and its activity-log label can't drift apart). The write goes through `scopedDb()` from `lib/tenant-db.ts`, same as any other school-portal write, and is also fire-and-forget so it never adds latency to a page render.

`User.lastLoginAt` is a denormalized convenience alongside this — it's what "staff/parent accounts activated" on the Schools detail panel checks (`lastLoginAt IS NOT NULL`) instead of aggregating `ActivityLog`.

## Local development database

There is no hosted database wired up for local dev. `npm run db:local` (`scripts/local-db.ts`, using the `embedded-postgres` package) initializes and runs a real Postgres server as a plain child process — no Docker, no system install — with its data directory at `/DATA/postgres` (gitignored). `DATABASE_URL` in `.env` points at it (`postgresql://postgres:postgres@localhost:5432/vidyayati`); the previous external (Neon) connection string is kept there as a commented-out line for whenever the project reconnects to an external database. Run `npm run db:local` before `npm run dev`; migrations and seeding (`npx prisma migrate deploy`, `npm run db:seed`) work against it exactly as they would against any other Postgres instance.

## Multi-tenancy enforcement

This is the load-bearing piece of the whole app, and it's centralized in `lib/tenant-db.ts` rather than left to each route to get right:

- At module load, it walks the Prisma DMMF and builds `TENANT_SCOPED_MODELS` — every model that has a `schoolId` field — instead of hardcoding a list, so a new model is automatically covered the moment someone adds `schoolId` to it in the schema.
- `scopedDb(schoolId)` returns a Prisma Client extension that intercepts every query against a tenant-scoped model: reads/updates/deletes get `schoolId` merged into `where`, creates get `schoolId` stamped onto `data`, upserts get it in both. Non-tenant-scoped models (platform-level things like `School` itself) pass through untouched.
- `getScopedDb()` is the call site API: it pulls `schoolId` off the current session via `auth()` and returns a client scoped to it. It throws if there's no session or no `schoolId` — which is deliberate, since a Super Admin session has neither and Super Admin code is expected to import the raw `db` export from `lib/db.ts` and query across schools on purpose.
- `scopedCreateData()` is a small typing helper so call sites can omit `schoolId` from a Prisma create payload (which the generated types otherwise require) without an inline cast at every call site.

The rule this enforces: **every school-portal route reads/writes through `getScopedDb()`, never the raw `db` export.** The raw client is for Super Admin routes and platform-level models only. `lib/db.ts` itself is just the standard singleton pattern to survive Next.js dev-mode hot reload without opening a new connection pool per save.

## Permissions within a school

Staff access is per-module, not a fixed role — enforced by `lib/permissions.ts`. `requireModuleAccess(moduleName, minimum)` checks the current session: School Admins get `FULL` on everything implicitly; Staff get whatever `AccessLevel` (`NONE` / `VIEW` / `EDIT` / `FULL`, ranked in that order) their `StaffPermission` row for that module says, defaulting to `NONE` if none exists; any other role calling it throws. This is what a module's `page.tsx` or `actions.ts` calls before doing anything, and it's the mechanism the `module` field in `sidebar-config.ts`'s `NavItem`s corresponds to (though the sidebar only controls visibility — the actual enforcement is this function, called server-side).

## Data model

`prisma/schema.prisma` — the original 41-model data dictionary plus `SchoolNote` and `ActivityLog` (added post-design for Super Admin school management; not in `design-reference/data-model.html`, which still documents the original 41), grouped by domain (platform/billing, people/access, academics, finance, admissions, operations, engagement, settings). Full field-level descriptions for the original 41 live in `design-reference/data-model.html`. Two schema conventions worth knowing: every non-platform model denormalizes `schoolId` directly onto itself (even where it's only transitively related to `School`) specifically so `tenant-db.ts` can scope centrally rather than needing per-model relation-filter logic; and `AccountsTransaction` is intentionally simple cash-in/cash-out rather than double-entry — `FeePayment` and `PayrollRun` writes are expected to also write a matching `AccountsTransaction` row (`source: AUTO_FEES` / `AUTO_PAYROLL`) so the ledger self-maintains.

`School` also carries a unique `code` (auto-generated from the school's initials at onboarding, editable after) and an optional `relationshipManager` (free-text, no separate table — Vidya Yati team members aren't modeled as their own entity yet). `User.email` is optional and no longer used for login (see "Auth and session"); `User.username` is the unique login identifier.

## What's stubbed or deferred

Per `CLAUDE.md`: no payment gateway (fee/invoice/payment rows exist, entered manually, no checkout flow), no WhatsApp/SMS (Communication module is in-app only), no biometric/RFID attendance (manual entry by Staff only), and phone-OTP login for parents is a schema-comment-level "considered, deferred" rather than implemented — the Credentials provider currently covers all four roles the same way, by username + password.

## Build order (as of this writing)

Per `CLAUDE.md`'s suggested order — auth/multi-tenancy first, then core entities, then highest-traffic screens, then the rest — the route structure above suggests most of the school-portal module list and the Super Admin portal already have at least a first pass (page + actions + form) in place. The marketing site (step 9, dark/high-tech, separate from the app shell) is the one explicitly called out as coming last.
