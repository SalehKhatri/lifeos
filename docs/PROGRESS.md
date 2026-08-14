# LifeOS — Progress Tracker

Status legend: 🔲 Not Started · 🔄 In Progress · ✅ Done · ⚠️ Needs Fix

Update this as you go. Keep notes short — one line per item is enough.

## Setup

| Item                              | Status | Notes |
| --------------------------------- | ------ | ----- |
| Repo structure (frontend/backend) | ✅     |       |
| DB + ORM decision                 | ✅     | Postgres + Prisma 7 |
| Postgres schema / migrations      | ✅     | `init` migration applied to local `lifeos` DB; User/Task/Project/ScheduleBlock/Category |
| Backend project scaffold          | ✅     | env config, Prisma singleton, error middleware, JWT auth middleware, app.ts/server.ts |
| Frontend project scaffold         | 🔲     | still default create-next-app output; TanStack Query not yet added |

## Auth

| Item                              | Status | Notes |
| --------------------------------- | ------ | ----- |
| Register endpoint                 | ✅     | bcrypt hash, issues JWT via httpOnly cookie |
| Login endpoint                    | ✅     |       |
| Logout endpoint                   | ✅     | stateless — no session store, clears the cookie |
| GET /auth/me                      | ✅     | frontend can't read the httpOnly cookie itself, needs this to know who's logged in; fetches fresh from DB (not the JWT payload) |
| PATCH /auth/me (edit profile)     | ✅     | update name and/or timezone |
| Delete account                    | ✅     | `DELETE /auth/me`, requires password re-entry; cascades to owned tasks/projects/schedule/categories |
| JWT middleware / protected routes | ✅     | `shared/middleware/auth.ts` `requireAuth`, used by all `/auth/me` routes |
| User profile fields (name, timezone) | ✅  | both optional at registration, timezone defaults to UTC |
| Password reset / email verification | 🔲  | deliberately deferred — needs a transactional email provider decision first, see Decisions Log |

## Categories

| Item                        | Status | Notes |
| ---------------------------- | ------ | ----- |
| Category model + migration  | ✅     | seeded defaults: Work, Personal, Health, Learning, Admin, Other |
| List/create/delete endpoints | 🔲     | model exists; module (routes/controller/service) not built yet — planned alongside Tasks |

## Tasks

| Item              | Status | Notes |
| ----------------- | ------ | ----- |
| Create task       | 🔲     |       |
| Edit task         | 🔲     |       |
| Delete task       | 🔲     |       |
| Complete task     | 🔲     |       |
| List/filter tasks | 🔲     |       |

## Projects

| Item                      | Status | Notes |
| ------------------------- | ------ | ----- |
| Create project            | 🔲     |       |
| Edit project              | 🔲     |       |
| Auto progress calculation | 🔲     |       |

## Availability / Schedule

| Item                      | Status | Notes |
| ------------------------- | ------ | ----- |
| Create schedule block     | 🔲     |       |
| Delete schedule block     | 🔲     |       |
| Compute today's free time | 🔲     |       |

## Prioritization Engine

| Item                            | Status | Notes |
| ------------------------------- | ------ | ----- |
| Scoring formula designed        | 🔲     |       |
| Scoring formula implemented     | 🔲     |       |
| Reason generation ("why this?") | 🔲     |       |
| /recommendations endpoint       | 🔲     |       |

## Today View

| Item                | Status | Notes |
| ------------------- | ------ | ----- |
| /today endpoint     | 🔲     |       |
| Frontend Today page | 🔲     |       |

## Known Issues / Fixes Needed

| Issue | Severity | Notes |
| ----- | -------- | ----- |
| No rate limiting on `/auth/login` and `/auth/register` | High | Nothing currently stops brute-forcing a password or hammering registration for account enumeration/spam. Not listed in `MVP_SPEC.md` Out of Scope — this is an unflagged gap, not a deliberate deferral. Cookie/JWT handling itself is otherwise solid (httpOnly, `sameSite: lax`, `secure` in production, 32+ char secret enforced). |

## Decisions Log

Short record of decisions made and why, so you don't relitigate them later.

- 2026-08-13 — Backend: Node.js + Express + TypeScript, separate from frontend.
- 2026-08-13 — DB/ORM: Postgres + Prisma, chosen for DX/speed on a small v1 schema.
- 2026-08-13 — Repo: single repo, two top-level folders (backend/, frontend/), no monorepo tooling.
- 2026-08-13 — Backend architecture: modular monolith (feature-based modules under
  modules/, each with routes/controller/service + a public index.ts). Chosen for loose
  coupling ahead of future modules (Finance, Fitness, etc.) without microservice overhead.
  Modules communicate only through each other's index.ts; dependencies flow one-way
  (e.g. recommendations → tasks/projects/schedule, never reversed).
- 2026-08-13 — Cross-module communication: direct in-process function calls only, no
  event bus / pub-sub. Not needed at monolith scale with a single consumer.
- 2026-08-13 — Handing off to Claude Code for implementation, going forward. CLAUDE.md added at repo root.
- 2026-08-13 — Task.category is a user-extensible `Category` model (own module,
  own endpoints), not a fixed enum. Seeded defaults (Work, Personal, Health,
  Learning, Admin, Other) have `userId = null` and are shared by all users;
  users can add their own on top. Chosen over a plain free-form string field
  per explicit user request. `MVP_SPEC.md` updated to reflect this (Category
  entity + `GET/POST /categories`, `DELETE /categories/:id`).
- 2026-08-13 — Task.status/priority and Project.status enum values aren't
  specified in `MVP_SPEC.md`; picked reasonable defaults when building the
  schema: TaskStatus (TODO/IN_PROGRESS/DONE), TaskPriority
  (LOW/MEDIUM/HIGH/URGENT), ProjectStatus (ACTIVE/ON_HOLD/COMPLETED/ARCHIVED).
  Revisit if product needs differ.
- 2026-08-13 — ScheduleBlock.startTime/endTime stored as Int minutes-since-midnight
  (not a time/string type) — simplest for the recommendation engine's duration-fit
  arithmetic later.
- 2026-08-13 — Local dev DB: existing Homebrew Postgres `lifeos` database, peer
  auth (no password), connection string in `backend/.env` (gitignored).
- 2026-08-13 — Prisma 7 requires a driver adapter for SQL providers and no longer
  auto-loads env vars; using `@prisma/adapter-pg` + `pg`, with `moduleFormat = "cjs"`
  on the generator so the generated client matches the rest of the backend (CJS).
- 2026-08-13 — Replaced `ts-node-dev` with `tsx` as the dev/seed TS runner: the
  `ts-node` internals `ts-node-dev` bundles are incompatible with the installed
  TypeScript 7 (`ts.sys` is undefined at runtime). `tsx` is the standard modern
  replacement — esbuild-based, handles real TS enums (unlike Node's native
  `--experimental-strip-types`, which can't). `tsconfig.json` also rewritten:
  the scaffolded config assumed ESM (`verbatimModuleSyntax` + no `"type": "module"`
  in `package.json`) which doesn't work with `ts-node-dev`/Express conventions here
  — switched to a plain CommonJS setup (`module`/`moduleResolution`: `NodeNext`,
  no `"type": "module"` needed).
- 2026-08-13 — Backend foundation built: env loader/validator (`shared/config`),
  Prisma client singleton with pg adapter (`shared/db`), typed error classes +
  centralized error middleware + 404 handler (`shared/middleware`), JWT
  `requireAuth` middleware (`shared/middleware/auth.ts` — cross-cutting, per
  `ARCHITECTURE.md`, separate from the auth module's register/login logic).
- 2026-08-13 — Auth module implemented (register/login/logout) — bcrypt password
  hashing, JWT issuance, zod-validated bodies, `{ data }` / `{ error }` response
  shape. Logout is a no-op (stateless JWT, no session store) — client just
  discards the token. Smoke-tested end-to-end (register, duplicate-email 409,
  bad-input 400, wrong-password 401, login, logout, 404 catch-all, JWT
  sign/verify + tamper rejection) against the local Postgres DB.
- 2026-08-14 — JWT delivery: httpOnly cookie (not `Authorization` header /
  localStorage) — immune to XSS token theft, mitigated CSRF via
  `SameSite=Lax`. Requires `cookie-parser`, and CORS now needs
  `credentials: true` + an explicit `CORS_ORIGIN` env var (no `*` origin —
  incompatible with credentialed requests). `requireAuth` reads the cookie,
  not a bearer header. Added `GET /auth/me` since the frontend can no longer
  read the token itself to know who's logged in.
- 2026-08-14 — Stuck with JWT over session-based auth (would need a session
  store — real new infra this project doesn't have, for revocation semantics
  a single-user personal app doesn't need). `User.passwordHash` made nullable
  to leave room for OAuth-only accounts later without a breaking migration —
  `login()` now rejects accounts with no password set.
- 2026-08-14 — Added `DELETE /auth/me` (delete account) — flagged by user as a
  missing but important endpoint. Requires password re-entry (destructive/
  irreversible action, session cookie alone isn't enough) and clears the auth
  cookie on success. Relies on the existing `onDelete: Cascade` FKs from
  Task/Project/ScheduleBlock/Category → User, so owned data is cleaned up in
  one `prisma.user.delete()` call, no manual cascade logic needed.
- 2026-08-14 — Fixed an N+1 query pattern in `prisma/seed.ts` (per-category
  `findFirst`/`create` loop) — flagged by user. Replaced with one `findMany`
  (diffed in memory) + one `createMany`. Added a rule to `CLAUDE.md`: never
  run a Prisma query inside a loop.
- 2026-08-14 — Added `User.name` (optional) and `User.timezone` (IANA string,
  default `"UTC"`) — for greetings ("Hello Saleh") and so the future Today
  View / Prioritization Engine can bucket "today" correctly per user. Both
  optional at registration per user's call; frontend will auto-detect
  timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Added
  `PATCH /auth/me` to edit them later.
- 2026-08-14 — Decided: changing `User.timezone` does NOT retroactively shift
  existing Task/Project deadlines. Deadlines are fixed instants the user meant
  at creation time; timezone is a display/interpretation preference only
  (formatting stored instants, and the Today View's local-day bucketing) —
  the recommendation engine's urgency math (`deadline − now`) is
  instant-to-instant and timezone-agnostic regardless. Avoids ever needing a
  bulk update-all-tasks-on-timezone-change operation (which would itself be
  the N+1/bulk-mutation pattern just ruled out above).
- 2026-08-14 — Timezone validation uses `Intl.DateTimeFormat` construction
  (try/catch), not `Intl.supportedValuesOf("timeZone")` — the latter reflects
  this Node's bundled ICU "canonical" list and can reject valid, widely-used
  aliases (caught in testing: it has `Asia/Calcutta` but not `Asia/Kolkata`,
  which is what most modern systems actually report). No new date library
  needed either way.
- 2026-08-14 — Audited Auth + `User` against `MVP_SPEC.md`: current fields
  (name, timezone, email, passwordHash) cover everything currently locked in
  scope (Tasks/Categories/Projects/Schedule/Prioritization Engine/Today View
  don't need anything more from `User`). Identified one real gap — no
  password-reset ("forgot password") flow — and deliberately deferred it
  rather than build it now: it needs a transactional email provider, which is
  new infra not in `ARCHITECTURE.md` and deserves its own decision (bundled
  with email verification, since both need the same email-sending piece).
  Revisit when email-sending is actually needed. Also deferred (low
  priority): future modules (Notifications, Finance/Fitness/etc.) will likely
  want their own `User` fields later (notification prefs, locale/unit
  prefs) — not adding speculatively, cheaper to add a nullable column when
  actually needed than to guess the shape now.
