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
| Frontend project scaffold         | 🔄     | in progress, see ## Frontend section below for detail |

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
| Category model + migration    | ✅     | seeded defaults: Work, Personal, Health, Learning, Admin, Other; `color` + `updatedAt` added 2026-08-14 |
| List/create/rename/delete endpoints | ✅ | `GET/POST /categories`, `PATCH/DELETE /categories/:id`; case-insensitive name uniqueness across defaults + own; defaults can't be renamed/deleted (403) |

## Tasks

| Item              | Status | Notes |
| ----------------- | ------ | ----- |
| Create task       | ✅     | validates categoryId + projectId via Categories/Projects modules' index.ts |
| Edit task         | ✅     | `PATCH /tasks/:id`; completedAt auto-syncs with status transitions |
| Delete task       | ✅     |       |
| Complete task     | ✅     | `POST /tasks/:id/complete`, idempotent (no-op if already DONE) |
| List/filter tasks | ✅     | `GET /tasks?status=&priority=&categoryId=&projectId=` |
| Project linkage   | ✅     | `Task.projectId` now wired up, validated via Projects module's `getOwnedProjectOrThrow` |

## Projects

| Item                      | Status | Notes |
| ------------------------- | ------ | ----- |
| Create project            | ✅     |       |
| Edit project               | ✅     | `PATCH /projects/:id` |
| Delete project             | ✅     | `DELETE /projects/:id` — added beyond the original locked API surface, see Decisions Log; un-links tasks (SetNull), doesn't delete them |
| Auto progress calculation | ✅     | `% tasks completed`, computed at query time via one `groupBy` (not stored, not a query-per-project) |
| List/filter projects       | ✅     | `GET /projects?status=` |

## Availability / Schedule

| Item                      | Status | Notes |
| ------------------------- | ------ | ----- |
| Create schedule block     | ✅     | `startTime < endTime` validated; `endTime` allows up to 1440 (exactly midnight), `startTime` capped at 1439 — see Decisions Log; optional client-generated `pairId` links an overnight commitment's two halves |
| Edit schedule block       | ✅     | `PATCH /schedule/:id` — added beyond original locked API surface, see Decisions Log; time-order re-validated against merged (existing + new) values |
| Delete schedule block     | ✅     |       |
| List/filter schedule      | ✅     | `GET /schedule?dayOfWeek=`, ordered by day then start time |
| Compute today's free time | ✅     | `recommendations.service.ts`'s `computeAvailableMinutesToday` — remaining minutes in the day minus not-yet-elapsed commitment minutes; overlaps not merged (known simplification). Fixed 2026-08-19 — see Decisions Log, was inverted (returned busy time, not free time). |

## Prioritization Engine

| Item                            | Status | Notes |
| ------------------------------- | ------ | ----- |
| Scoring formula designed        | ✅     | urgency 0.45 / priority 0.30 / fit 0.25, see `MVP_SPEC.md` §5 for full formula |
| Scoring formula implemented     | ✅     | `modules/recommendations/scoring.ts` (pure functions) + `recommendations.service.ts` (orchestration) |
| Reason generation ("why this?") | ✅     | template-based, not LLM — falls back to "Ranked by priority and deadline" |
| /recommendations endpoint       | ✅     | excludes ON_HOLD/ARCHIVED-project tasks and DONE tasks; deterministic tie-break (deadline, then createdAt) |

## Today View

| Item                | Status | Notes |
| ------------------- | ------ | ----- |
| /today endpoint     | ✅     | `modules/today` — top task + up to 3 "up next" (both from Recommendations) + today's fixed commitments (from Schedule) |
| Frontend Today page | ✅     | see Frontend section below |

## Frontend

Building phase-by-phase (see the approved plan, referenced in chat). Design system,
tokens, and conventions fully documented in `frontend/DESIGN.md` — read that before
styling anything new.

| Item                                 | Status | Notes |
| ------------------------------------- | ------ | ----- |
| Foundation (Phase 0)                  | ✅     | shadcn/ui + react-hook-form + zod + TanStack Query + Motion; `lib/api-client.ts`, `lib/query-client.tsx`, `types/`, `features/auth/{api,hooks}.ts` |
| Design system                         | ✅     | "blend" cyberpunk theme (cyan primary, magenta/amber deliberate accents), dark-only, 4-tier typography (Orbitron/Chakra Petch/Geist Sans/Geist Mono), subtle-&-snappy Motion conventions — all in `frontend/DESIGN.md` |
| Auth pages (login/register)           | ✅     | `AuthLayout` (two-column, ambient cursor-reactive glow orbs), name required, timezone auto-detected + shown read-only, API errors as toast (not inline banner — layout-shift lesson), field errors inline+animated |
| Nav shell + route guard               | ✅     | text-only nav (no icons/avatar — reads "dashboard" otherwise), animated underline indicator via Motion `layoutId`, `useCurrentUser()` *is* the auth state (no separate Context) |
| Command palette (Cmd/Ctrl+K)          | ✅     | brought into v1 scope deliberately (see `docs/MVP_SPEC.md` §7) — data-driven `COMMANDS` array, digit-key (1-9) instant-select, footer shortcut hints |
| Tasks + Categories page                | ✅     | Phase 2 — filters, list, create/edit Sheet, delete, inline category manager |
| Projects page                          | ✅     | Phase 3 — status filter, Card grid with progress bars, create/edit Sheet, delete AlertDialog, inline status control |
| Schedule page                          | ✅     | Phase 4, since redone as a week calendar grid (2026-08-19, see Decisions Log) — click-to-edit Sheet, delete moved into the Sheet's footer |
| Today page                             | ✅     | Phase 5 — the priority page per `docs/ARCHITECTURE.md`: top-task hero card, "Up Next", today's commitments |
| Settings page                          | ✅     | Phase 6 — profile (name + timezone combobox), danger-zone delete-account with password confirm |
| Polish pass (Phase 7)                  | ✅     | Consistent loading/error/empty states across Tasks/Projects/Schedule/Today, destructive-styled delete confirmations everywhere, full clean rebuild |

## Known Issues / Fixes Needed

| Issue | Severity | Notes |
| ----- | -------- | ----- |
| No rate limiting on `/auth/login` and `/auth/register` | High | Nothing currently stops brute-forcing a password or hammering registration for account enumeration/spam. Not listed in `MVP_SPEC.md` Out of Scope — this is an unflagged gap, not a deliberate deferral. Cookie/JWT handling itself is otherwise solid (httpOnly, `sameSite: lax`, `secure` in production, 32+ char secret enforced). |
| Postman sync pending for Schedule, Recommendations, Today | Low | The 2026-08-16 Postman sync covered Auth/Categories/Tasks/Projects only — Schedule (built same day, after that sync) and Recommendations/Today (built 2026-08-18) still need it. |

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
- 2026-08-14 — Revisited Task/Category schemas against `MVP_SPEC.md` before
  building the Tasks module. Confirmed Out-of-Scope items (recurrence,
  dependencies, tags, energy-level, snooze/duplicate, daily-plan
  auto-generation, duration prediction) correctly imply no corresponding
  fields exist. Added `updatedAt` to both `Task` and `Category` (Project
  already had one) — cheap now, annoying migration later. Added `Category.color`
  (optional hex) for UI badges — not in spec but cheap and directly useful.
  Added Category rename (`PATCH /categories/:id`, own categories only, same
  permission model as delete) — the gap mattered because `Task.category` has
  `onDelete: SetNull`, so delete+recreate-to-rename was silently uncategorizing
  every task using that category.
- 2026-08-14 — Category names are unique per-user case-insensitively across
  defaults + own (checked at the service layer via Prisma's `mode: "insensitive"`,
  not a DB constraint — Postgres unique indexes are case-sensitive by default).
  Prevents a confusing pair like "Work" (default) and "work" (custom) both
  showing up for the same user.
- 2026-08-14 — `Task.projectId` is NOT exposed via the Tasks API yet, even
  though the column exists. Validating it would require querying the `Project`
  Prisma model directly from the Tasks service, which `ARCHITECTURE.md`
  explicitly forbids ("never reach into another module's ... Prisma models
  directly") — and the Projects module doesn't exist yet to expose a proper
  `index.ts` check. Will add `categoryId`-style validation (via Projects'
  `index.ts`) once that module is built.
- 2026-08-14 — Migration gotcha: adding a required `updatedAt` column to
  `categories` (6 seeded rows already present) needed `--create-only` +
  manually adding `DEFAULT CURRENT_TIMESTAMP` to the generated SQL to backfill
  existing rows — Prisma won't auto-add a required column with no default to
  a non-empty table. Prisma's `@updatedAt` still explicitly sets the value on
  every write going forward; the SQL-level default only matters for the
  backfill (and any raw-SQL inserts).
- 2026-08-16 — Added `DELETE /projects/:id`, beyond `MVP_SPEC.md`'s originally
  locked API surface (which only listed GET/POST/PATCH) — flagged as a likely
  oversight since Tasks and Categories both support real delete, and
  `Task.project` already has `onDelete: SetNull` (deleting a project safely
  un-links its tasks rather than deleting them). User confirmed: add it.
- 2026-08-16 — Wired up `Task.projectId` (deferred since 2026-08-14): validated
  on task create/update via Projects module's `getOwnedProjectOrThrow`
  (`modules/projects/index.ts`), same pattern as `categoryId` →
  `getUsableCategoryOrThrow`. Verified cross-user isolation live (user B
  cannot link a task to user A's project — 404, not 403, consistent with
  Tasks/Categories' "don't hint a private resource exists" convention).
- 2026-08-16 — Architecture conflict, resolved with user sign-off: Tasks
  depending on Projects (for `projectId` FK validation) and Projects also
  depending on Tasks (for progress's task counts) would be a real circular
  module dependency, which `ARCHITECTURE.md` forbids outright. Chose to keep
  Tasks → Projects (the safety-critical, write-path direction, consistent
  with the `categoryId` precedent) and have `projects.service.ts` query the
  `Task` table directly for progress instead — a deliberate, narrow, flagged
  exception to "never touch another module's Prisma models directly" (a
  weaker rule than "no circular dependencies"). Documented in both
  `ARCHITECTURE.md` and here so it isn't mistaken for an oversight; if a third
  module needs the same kind of cross-read, promote it to a proper aggregator
  instead of adding another one-off.
- 2026-08-16 — Project progress computed via one `groupBy` query (grouped by
  `projectId` + `status`, counts summed in memory) regardless of how many
  projects are being listed — not a query per project. Verified with a real
  project + 4 tasks (1 completed) → 25% reported correctly on both
  `GET /projects` and `GET /projects/:id`.
- 2026-08-16 — Added `PATCH /schedule/:id`, beyond `MVP_SPEC.md`'s originally
  locked API surface (GET/POST/DELETE only) — same gap shape as Category
  rename and Project delete, now a well-established pattern, so applied
  directly rather than re-asking: Tasks/Categories/Projects all support edit,
  and unlike Category, nothing references `ScheduleBlock` via FK, so
  delete+recreate has zero cascade side effects anyway — this is a pure
  convenience add, not a footgun fix. Added `createdAt`/`updatedAt` for the
  same consistency reasons as Task/Category earlier (table was empty, no
  backfill migration needed this time).
- 2026-08-16 — `ScheduleBlock.startTime` must be strictly before `endTime`
  (enforced on create via zod `.refine`, and on update by merging the partial
  input with the existing record before checking — a partial update can't be
  validated against itself alone). No overlap-prevention across blocks on the
  same day — deliberately left to the Prioritization Engine to handle (interval
  merging) when it computes available time, not Schedule's job at write time.
- 2026-08-16 — Postman fully synced for Auth, Categories, Tasks, Projects
  (`LifeOS API` collection, "My Workspace" on the individual account): one
  folder per module, one request per route, each with docs (body/query
  schema, auth requirement, success shape, error table) and success + one
  representative-error saved example. Removed the "Postman sync pending"
  Known Issue — it was already stale when written (Auth/Categories/Tasks had
  been synced earlier in the same session) and is now fully resolved,
  including the `projectId` wiring on Tasks and the new Projects module.
- 2026-08-18 — Prioritization Engine formula locked (see `MVP_SPEC.md` §5 for
  the full spec). Key calls: urgency bucketed by LOCAL CALENDAR DAY distance
  to the deadline (via `User.timezone`), not a rolling hour window, so "due
  today" means "before local midnight tonight" — verified live with a deadline
  exactly 30 hours out landing in the "due tomorrow" bucket because it crossed
  a calendar-day boundary, not because of the raw hour count. Weights
  (0.45/0.30/0.25) are the most arbitrary part and the easiest to retune.
  Deterministic tie-break added (deadline, then createdAt) since the whole
  point of this engine is determinism — ties can't be left to insertion order.
- 2026-08-18 — Tasks under `ON_HOLD`/`ARCHIVED` projects are excluded from
  recommendations entirely (user-confirmed). `Task.project` is already
  included via Tasks' own `getRecommendableTasks` (added for this purpose,
  exported via `modules/tasks/index.ts`), so Recommendations never needs to
  depend on the Projects module directly for this — avoids yet another
  cross-module dependency.
- 2026-08-18 — Recommendations depends on Auth (`getProfile`, for
  `timezone`), Tasks (`getRecommendableTasks`), and Schedule
  (`listScheduleBlocks`) — all via each module's `index.ts`. Today depends on
  Auth, Recommendations, and Schedule the same way. Both are one-way (leaf
  modules never import back), so this doesn't hit the same circular-dependency
  problem the Tasks↔Projects progress calculation did.
- 2026-08-18 — Added `shared/utils/timezone.ts` (`getLocalDayAndMinutes`,
  `daysBetweenLocalDates`) — generic, business-rule-free Intl-based
  conversions, not specific to Recommendations, so they live in `shared/` like
  `shared/utils/params.ts` rather than inside the module.
- 2026-08-18 — Verified the full engine live with a scripted test (dynamic
  relative deadlines, not just fixed fixtures): every printed score
  hand-checked against the formula and matched exactly; confirmed completed
  tasks, ON_HOLD-project tasks, and ACTIVE-project tasks are
  excluded/included correctly; confirmed graceful empty-state (`/today` with
  zero tasks returns `topTask: null`, not an error); confirmed the reason
  fallback string triggers correctly when no signal stands out.
- 2026-08-19 — Frontend build kicked off, planned phase-by-phase (see the
  approved plan). UI toolkit: shadcn/ui + react-hook-form + zod (user's
  explicit choice among three options) — new dependencies/patterns beyond
  `ARCHITECTURE.md`, flagged per `CLAUDE.md` before deciding. Auth state /
  route guard: a `useCurrentUser()` TanStack Query hook *is* the auth state,
  no separate React Context — keeps JWT verification exclusively in the
  backend (frontend never needs `JWT_SECRET`), which matters since these are
  two independently deployable services.
- 2026-08-19 — Visual direction: "blend" cyberpunk theme (cyan primary,
  magenta/amber as deliberate secondary accents — not wired into shadcn's
  generic hover states, reserved for signals that should actually stand out),
  dark-only for v1, subtle & snappy animations (not showy/cinematic) via
  `motion` (Framer Motion). Explicit user requirement: keep the design
  genuinely re-themeable later (they may want a different look once it's
  fully built) — every color/shadow is a CSS-variable token, animation timing
  centralized in `frontend/src/lib/motion.ts`, all documented in the new
  `frontend/DESIGN.md`, which is the source of truth for this system
  (`docs/ARCHITECTURE.md`'s Frontend section just points to it).
- 2026-08-19 — Four-tier typography, decided live by comparing real rendered
  candidates (font choice isn't judgeable from text description) in a
  temporary preview page: Orbitron for the "LIFEOS" wordmark only (too
  wide/blocky for anything smaller), Chakra Petch for headings *and* small
  uppercase tracked labels (same "micro-heading" tier), Geist Sans kept for
  body/secondary text (highest-volume, most-read text — stays on the font
  built for dense UI reading, not a display face), Geist Mono kept for
  data-like elements (scores, timestamps, durations).
- 2026-08-19 — Known shadcn + Tailwind v4 + Next.js gotcha hit and fixed:
  `@theme inline` resolves CSS variables at parse time, so pointing
  `--font-sans`/`--font-heading`/`--font-brand` at a `next/font`-injected
  runtime variable (e.g. `var(--font-geist-sans)`) doesn't reliably apply —
  fixed by using literal font-family name strings instead, for all four
  fonts.
- 2026-08-19 — This shadcn CLI version (4.18.0) differs from older
  documentation in a few ways worth remembering: default style resolved to
  "base-nova"/"base" rather than "new-york" (not fought back to a specific
  named style — just used what `-d` actually produced); uses `@base-ui/react`
  or Base UI/Radix depending on component rather than only `@radix-ui/react-*`
  packages; the `form` registry item is an empty stub in this version (no
  generated `form.tsx`) — forms are composed directly with `react-hook-form` +
  the `Label`/`Input`/`Select` primitives instead.
- 2026-08-19 — HTTP client: native `fetch`, not axios (user asked directly,
  wanted the long-term reasoning, not just "boring/simple"). Fetch's native
  `ReadableStream` fits future streaming/AI use cases (relevant given the
  longer-term "Jarvis"-style ambition) better than axios historically has;
  Next.js's fetch-specific caching extensions are available if server-side
  data fetching is ever added; TanStack Query's cancellation model is built
  around `AbortController`, which fetch consumes natively.
- 2026-08-19 — Fixed a self-inflicted bug: `npm install motion` was
  accidentally run from the repo root instead of `frontend/`, creating a
  stray root-level `package.json`/`package-lock.json`/`node_modules` (caught
  via a Turbopack "multiple lockfiles" warning, not silently). Removed (was
  untracked, never committed) and reinstalled correctly inside `frontend/`.
- 2026-08-19 — Nav shell reworked after user feedback (read as generic
  SaaS-admin dashboard, not Jarvis/HUD): dropped Lucide icons + avatar
  entirely, went text-only with an animated underline that slides between
  active nav items (Motion `layoutId`). Full reasoning + the "reactive, not
  static" standing principle this established are in `frontend/DESIGN.md`.
- 2026-08-19 — Command palette (Cmd/Ctrl+K) deliberately brought into v1
  scope — was `MVP_SPEC.md`'s "Out of Scope: keyboard shortcuts, command
  palette" line; user explicitly asked for keyboard-first fast access
  instead of clicking through multiple pages. `MVP_SPEC.md` updated (§7,
  Out of Scope line removed) rather than silently drifting past a locked
  scope decision. Instant-select via digit keys 1-9, not mnemonic letters —
  full reasoning (input-focus conflicts, browser-reserved Cmd+letter
  shortcuts) in `frontend/DESIGN.md`.
- 2026-08-19 — General nav keyboard-accessibility pass: every interactive nav
  element (links, ⌘K button, user menu trigger) got an explicit
  `focus-visible` cyan-glow ring — several had none before (relying on
  browser default), which isn't acceptable given the explicit ask for the
  whole app to be fully keyboard-operable.
- 2026-08-19 — Phase 2 (Tasks + Categories) built. `features/categories/`
  (api+hooks+`CategoryManager`, a Popover-based quick add/delete scoped to
  the user's own categories, mounted inline next to the task form's category
  select — no top-level nav item, matching `ARCHITECTURE.md` which only
  names Today/Tasks/Projects/Schedule as pages). `features/tasks/`
  (api+hooks+`TaskFormSheet`/`TaskList`/`TaskFilters`), tied together in
  `/tasks`. `lib/api-client.ts`'s `toQueryString` signature changed from
  `Record<string, QueryValue>` to plain `object` (cast internally) — a
  concrete interface like `TaskFilters` doesn't structurally satisfy an
  index-signature type in TS even when every property matches.
  `estimatedDuration` uses plain `z.number().int().positive()` +
  `register(..., { valueAsNumber: true })` rather than `z.coerce.number()`,
  since coerce schemas have mismatched input/output types that break
  `useForm<T>`'s generic. `useCompleteTask` deliberately has no success
  toast (error only) — the checkbox's own visual state is the feedback;
  a toast on every checkbox click on a frequent action would be noise.
  `TaskList`'s delete confirmation is a single shared, state-controlled
  `AlertDialog` rather than an `AlertDialogTrigger` nested inside a
  `DropdownMenuItem` — that nested pattern fights the menu's
  close-on-select behavior and Base UI's portal/focus handling (this
  project has already hit a few Base UI-vs-Radix surprises). Project select
  is intentionally not on the task form yet — Projects (Phase 3) doesn't
  exist to list from until that phase lands.
- 2026-08-19 — Post-Phase-2 fixes from user click-through: (1) Base UI's
  `<Select.Value>` only resolves a value to a label from items mounted
  inside the popup at least once — pre-set filters ("all") and edit-mode
  pre-fills never open the dropdown first, so triggers showed the raw
  sentinel/enum/id. Fixed everywhere via `Select.Root`'s `items` prop (a
  `{ value: label }` map, resolved immediately regardless of mount state);
  documented in `frontend/DESIGN.md`'s component-gotchas section since
  Projects/Schedule will hit the same thing. (2) Category color picker now
  seeds a random color (`lib/colors.ts`) instead of a flat hardcoded
  default — hue is random but saturation/lightness are bounded to the same
  vivid, dark-legible band the cyan/magenta/amber accent tokens live in, so
  it stays "in-theme" rather than fully random RGB. Re-rolls after each
  create. (3) Task filter's category select now shows the color dot in its
  trigger too, not just the open list (same `items`-accepts-ReactNode
  mechanism as the label-resolution fix).
- 2026-08-19 — Task card redesign after user feedback ("boring", didn't
  match the HUD/Jarvis direction): added a priority-colored edge stripe
  (glowing only for HIGH/URGENT, per the "reserved, not default" accent
  rule), corner targeting-frame ticks, and a cursor-follow radial highlight
  (written directly to CSS vars in the pointermove handler, not React state —
  same reasoning as the auth pages' cursor-torch effect). Priority moved from
  a filled `Badge` to a small text readout (the edge stripe already carries
  the filled/glow treatment). Category is now a chip using its own color
  dynamically instead of a plain outline badge + dot; Project — previously
  not rendered at all, even though `Task.project` already comes back from the
  API — is now shown as a fixed accent-cyan chip when present, ahead of
  Phase 3 adding a way to actually set it from the frontend. Added a small
  pulsing dot for `IN_PROGRESS` tasks (previously visually identical to
  `TODO`). Also fixed `Badge`'s hardcoded `rounded-4xl` pill shape to
  `rounded-sm`, matching this theme's deliberately sharper `--radius` token.
  Full reasoning in `frontend/DESIGN.md`.
- 2026-08-19 — Task complete checkbox reworked, two user-reported problems:
  (1) it was almost invisible once checked — the card's `opacity-60` (done
  state) and the checkbox's own `disabled:opacity-50` (it was disabled once
  checked) were compounding to ~0.3 opacity. (2) it was a one-way action
  from the list (disabled once done, no undo short of opening the edit
  form) — a mis-click had no easy recovery. Fixed both together: the
  checkbox is a real toggle now (unchecking reverts the task to `TODO`) and
  always renders at full opacity — only the title/metadata content wrapper
  dims when done, not the checkbox itself. (Reopen initially reused the
  generic `useUpdateTask` mutation for this — see the next entry for why
  that was wrong and got its own hook instead.)
- 2026-08-19 — Toast copy overhaul (Tasks + Categories), user-reported: reopening a task
  showed a success toast ("Task updated") while completing it showed none — traced to reopen
  reusing the generic `useUpdateTask` mutation instead of its own hook. Fixed by giving reopen
  its own `useReopenTask` hook that mirrors `useCompleteTask` (no success toast, error only,
  symmetric on both directions of the checkbox toggle) instead of piggybacking on the edit
  form's update mutation. Separately, rewrote every task/category toast (create/update/delete)
  from generic phrases ("Task updated successfully") to past-tense action + quoted identifying
  name (`Created "Buy groceries"`, `Deleted category "Work"`) — mutation hooks now take the
  full entity instead of a bare id so the name is available for the message. Convention
  recorded in `frontend/DESIGN.md` to apply to every future mutation hook
  (Projects/Schedule/Settings), not just these two.
- 2026-08-19 — `CategoryManager` gained rename + recolor for own categories
  (backend already supported `PATCH /categories/:id`; the frontend just
  never exposed it beyond create/delete). Color is a native
  `<input type="color">` per row that saves immediately on change — the
  picker closing is already its own "commit" gesture, no separate save
  step needed. Name is inline-editable (Pencil to enter edit mode, swaps
  the row's icons to Check/X to save/cancel, Enter/Escape do the same) —
  one row editable at a time, kept in local `editingId` state rather than
  per-row state, since only one edit can realistically be in flight in a
  popover this small.
- 2026-08-19 — `/tasks` productivity pass, per user request for "real information that
  matters, not just fancy stuff" plus shortcuts: added a stats line (shown/overdue/due-today,
  reflecting the current filter+search view, not a separate global count), client-side search
  (title substring) and sort (soonest-deadline default, or priority/newest — no new backend
  endpoint, cheap over one user's list) in `features/tasks/sort.ts`, and deadline urgency
  coloring distinct from priority (`lib/datetime.ts`'s `getDeadlineUrgency` — overdue/due-today
  are objective, time-based facts, unlike priority which is a user opinion). Page shortcuts:
  `/` focuses search, `n` opens the create Sheet. Also wired the command palette's long-pending
  "New Task" entry (`?new=1` query param bridge into the page's local sheet state) — hit and
  documented a real React 19 lint rule (`react-hooks/set-state-in-effect`) doing so; fixed via
  `useState`'s lazy initializer rather than suppressing it. Full reasoning in
  `frontend/DESIGN.md`.
- 2026-08-19 — User-reported friction: moving a task to `TODO`/`IN_PROGRESS` required opening
  the edit Sheet just to change one field. Fixed by turning the previously-decorative
  "In Progress" pulsing dot into a real one-click toggle button on the card itself (`TODO` ↔
  `IN_PROGRESS`; `DONE` stays exclusively the checkbox's job). Generalized `useReopenTask` into
  `useSetTaskStatus({ task, status })`, which now backs both the checkbox's "reopen" and this
  new toggle — same no-success-toast treatment as `useCompleteTask` (frequent, low-stakes,
  checkbox-adjacent, not a deliberate form save).
- 2026-08-19 — Task card redesigned again, this time from scratch, after direct user feedback
  ("not convinced ... don't give me a good experience") on the previous HUD-heavy version:
  too visually busy, hard to scan, interactions not obvious. Presented two concrete
  alternatives (ASCII mockups) rather than guessing again after several rounds of
  smaller fixes on the same file; user picked "structured, two-line, one explicit status
  control." Replaced the checkbox + separate near-invisible toggle-dot with a single `Select`
  covering `TODO`/`IN_PROGRESS`/`DONE` (confirmed against the backend that `PATCH /tasks/:id`
  already handles `completedAt` correctly for a direct `DONE` transition, so no need to route
  through the dedicated `/complete` endpoint here). Removed the corner-tick brackets and
  cursor-follow glow entirely — purely decorative, no information value, the concrete thing
  "too busy" was pointing at. Priority's colored border now only appears for HIGH/URGENT
  (previously every row got some edge treatment). Metadata reorganized into a clear two-line
  hierarchy (status+title+menu, then objective-facts-first metadata line). Full reasoning
  in `frontend/DESIGN.md`, including the standing lesson: every visible element should carry
  real information or be an unambiguous control, never decoration for its own sake.
- 2026-08-19 — Immediate follow-up feedback on the above: "lost the jarvis vibe." Root cause
  wasn't missing the removed decoration (corner ticks/cursor-glow stayed removed, correctly)
  — it was that the priority label had also lost its `font-heading` tracked-uppercase
  treatment (the app's HUD-voice typography tier) down to a plain span during the rewrite.
  Restored it (free — a font choice, no new element). Added a cheap CSS-only hover glow on
  the whole card (no pointermove/JS needed for "reactive"), a permanent faint cyan border on
  the status control at rest so it reads as a system widget rather than a generic dropdown,
  and a genuine glow specifically on `URGENT` tasks (the one tier rare enough to earn it,
  per the existing "glow is reserved" rule).
- 2026-08-19 — Phase 3 (Projects) built: `features/projects/` (api+hooks, mirroring Tasks'
  shape exactly — `useCreateProject`/`useUpdateProject`/`useDeleteProject` with the toast
  copy convention, `useSetProjectStatus` as the no-toast quick-status-change hook, same
  reasoning as `useSetTaskStatus`), `/projects` as a responsive Card grid (not a dense list
  like Tasks — projects are fewer and more "at a glance" than a working task list) with a
  progress bar (`Progress` — a new shadcn primitive, added via `npx shadcn add progress`,
  anticipated in the original approved plan) plus a `completed/total · %` readout, one
  explicit status `Select` per card (`ACTIVE`/`ON_HOLD`/`COMPLETED`/`ARCHIVED` — applying the
  task-card lesson proactively instead of waiting to be asked: no checkbox/dot split here to
  begin with), status filter, create/edit Sheet, delete AlertDialog. Confirmed against the
  backend (`projects.validation.ts`) the exact field contract before building: `name`
  required, `description`/`status`/`deadline` optional, `deadline` via `z.coerce.date()`
  (any parseable date/datetime). Also closed the Phase 2 TODO: `TaskFormSheet` now has a
  Project select (`Task.projectId` was already wired up on the backend since 2026-08-16, the
  frontend just had nothing to list from until now). Command palette's `?new=1` bridge
  pattern (from Tasks) replicated for `/projects` and a "New Project" entry added.
- 2026-08-19 — User question ("does it make sense to show project-wise tasks?") surfaced a
  real gap: `Task.projectId` was filterable on the backend and even in the frontend's
  `TaskFilters` type, but no UI anywhere exposed it — no way to see "tasks in Project X".
  Chose a lean bridge over a `/projects/[id]` detail page (which would duplicate Tasks'
  search/sort/urgency/status-control in a second UI): added a Project filter to
  `TaskFilters` (same pattern as Category), and made each project card's task-count a real
  `<Link>` to `/tasks?projectId=X`, read on the Tasks page via the same lazy-initializer
  pattern as the `?new=1` bridge — except this one stays in the URL afterwards (a filter is
  worth bookmarking/sharing/surviving a refresh, unlike a one-shot "open the sheet" signal).
- 2026-08-19 — User-reported: four always-visible filter Selects (status/priority/category/
  project) on `/tasks` — right after Project became the fourth — felt overwhelming. Collapsed
  into a single "Filters" `Popover` trigger with a count badge (only shows when a filter is
  active) and a "Clear all" action, holding all four Selects stacked with labels
  (`components/form-field.tsx`, the same one every Sheet form already uses — no new label
  pattern invented). Toolbar footprint drops from 6 always-visible controls (search + 4
  filters + sort) to 3 (search + Filters + sort), with the same information (which filters
  are active) now surfaced via the badge instead of via always-showing every control.
- 2026-08-19 — User-reported: the toolbar row itself "looked ugly." Root cause: the Filters
  trigger was `size="sm"` (`h-7`) while the search `Input` and Sort `Select` sat at `h-8` —
  three controls in one row at two different heights. Fixed by unifying all three at `h-8`
  (`Input` needed a plain className override, since unlike `Select`/`Button` it has no
  size-variant system). Also fixed a stray `w-full` on the search box's wrapper fighting its
  own `max-w-56` (made it try to claim the full row width inside the `flex flex-wrap`
  container) — changed to `w-56 shrink-0`. Added a vertical `Separator` between Filters and
  Sort to visually group "narrowing the list" from "ordering it." Also added, per an explicit
  ask to add shortcuts wherever they'd help: `f` toggles the Filters popover, `s` cycles sort
  order — both with visible `kbd` hints where there was room for one without re-cluttering
  the toolbar this pass just decluttered. Added `n` (new project) to `/projects` too, for
  parity with `/tasks` — "master control" is a standing app-wide principle, not opt-in per
  page. Full reasoning in `frontend/DESIGN.md`.
- 2026-08-19 — Three user-reported issues fixed together: (1) sort cycling changed the
  dropdown value but the list looked unchanged — code review found the sort logic itself
  correct, so added `layout` to each task row's `motion.div` for an animated re-order (makes
  any position change visually unambiguous, doesn't rely on the list being long enough to
  notice an instant DOM reorder). (2) Vague validation messages on Task/Project sheets —
  concretely, clearing the duration number input produced Zod's raw default ("Invalid input:
  expected number, received NaN") since `estimatedDuration` had no custom base-type message;
  also added missing `.max()` messages for title/name/description. Rule now: every schema
  constraint gets an explicit plain-language message, never Zod's default. (3) Deadline
  fields on both Sheets now default to right now (computed fresh on open, not baked into the
  static `EMPTY_VALUES`) instead of empty — native `datetime-local` already includes a time
  picker as part of the browser's own control, no new component needed.
- 2026-08-19 — Bug: creating a task without a category/project threw "Invalid input:
  expected string, received null" (x2). Root cause: the backend's `createTaskSchema` defines
  `categoryId`/`projectId` (and `description`/`deadline`) as `z.string().optional()` —
  omit-only, `null` fails — while `updateTaskSchema` defines the same fields as
  `.nullable().optional()`, where `null` is correct (explicitly clears the field).
  `TaskFormSheet` built one shared payload with a hardcoded `?? null` fallback used for both
  create and update; fixed by using `undefined` fallbacks in the base values (dropped
  entirely by `JSON.stringify` — safe for create) and only coercing to `null` inside the
  update branch. `ProjectFormSheet` already did this correctly (separate create/update
  branches, never merged into one object). Rule recorded in `frontend/DESIGN.md`: never share
  one payload object across create/update for a resource with any nullable-on-update field.
- 2026-08-19 — Confirmed deliberate: past deadlines are allowed on Tasks/Projects, no
  validation blocking them (already true today — no `min` attribute on the date input, no
  Zod refinement on either frontend or backend). The app already treats overdue as
  first-class data (red "overdue" text, the stats line's overdue count, the Prioritization
  Engine's urgency weighting) rather than an error state; blocking past dates at creation
  would contradict that and break normal use (backfilling a task logged after its due date,
  editing a task whose deadline quietly passed). Also matters now that deadline fields
  default to "right now" on open — a hard block would make that default randomly fail
  depending on how long someone takes filling out the rest of the form.
- 2026-08-19 — Phase 4 (Schedule) built: `features/schedule/` (api+hooks, same toast copy
  convention as Tasks/Projects), `lib/time.ts` (minutes-since-midnight ⇄ `<input type="time">`
  conversions + a 12h display formatter — `ScheduleBlock.startTime`/`endTime` are ints, not a
  time/string DB type, per the 2026-08-16 decision). `/schedule` groups blocks into all 7 days
  always shown (even empty ones — "fully free" is real information, not a state to hide),
  today's section highlighted, each day showing its committed-hours total; a shared
  create/edit Sheet uses native `<input type="time">` (already includes a time picker as part
  of the browser's own control) with a client-side mirror of the backend's `startTime <
  endTime` cross-field check for immediate feedback. New commitment defaults to the next full
  hour on today's day-of-week (rounds up, not the exact current minute — a block labeled
  "3:47 PM–4:47 PM" reads oddly for a recurring commitment) — same "compute fresh on open,
  don't bake into a static constant" pattern as Task/Project deadlines. No nullable-on-update
  fields on `ScheduleBlock` (unlike Tasks/Projects), so the create/update payload split
  documented for those forms doesn't apply here. `n` shortcut + command palette "New
  Commitment" (`?new=1` bridge) added for parity with Tasks/Projects.
- 2026-08-19 — User question: what about schedule changes / one-time events (e.g. "movies
  Friday night")? Answered directly rather than building blind: (1) recurring schedule
  changes need no new feature — `ScheduleBlock` is a live template, not a versioned history,
  and the recommendation engine only ever asks "available time *today*," never historical
  schedule state, so editing/recreating a block when a routine changes is already sufficient.
  (2) one-time dated events are a real gap, but a deliberate v1 exclusion already locked in
  `docs/MVP_SPEC.md` §4 ("recurring weekly blocks only") — `ScheduleBlock` has no
  specific-date field, only `dayOfWeek`. Confirmed with user: defer rather than expand scope
  mid-build. Made the exclusion explicit in `MVP_SPEC.md`'s Out of Scope list (previously
  only implied by §4's "only" wording) so it reads as a documented decision, not something
  that got missed.
- 2026-08-19 — Schedule productivity pass, four additions picked by user from a proposed
  list: (1) multi-day quick-create — the Day field is now toggle buttons, not a `Select`;
  create mode allows selecting several days at once (e.g. "Work" Mon-Fri in one action),
  backed by a new `useCreateScheduleBlocks` (plural, `Promise.allSettled`, one consolidated
  toast for the whole batch). (2) client-side overlap warning
  (`features/schedule/overlap.ts`) — the backend deliberately allows overlapping blocks, so
  this is a warning (amber tag + icon), never a save-blocking validation. (3) deterministic
  per-label color coding (`lib/colors.ts`'s `hashLabelToColor`) — same label always gets the
  same color, no color field needed on `ScheduleBlock`. (4) a compact daily timeline bar
  showing each day's blocks as proportional colored segments plus a current-time marker on
  today — see the day's shape at a glance instead of reading every time range as text. Full
  reasoning in `frontend/DESIGN.md`.
- 2026-08-19 — User-reported: the 7 day sections "blend together." First attempt
  (`border-b` under each header) didn't help either — the page sits on the authenticated
  shell's `.hud-grid-bg` texture, and a 1px border just blends into that existing grid
  instead of reading as a boundary. Fixed with an actual fill per day (`bg-muted/20`, kept
  subtle so it doesn't read as a card-inside-a-card next to the commitment rows' `bg-card`)
  — a real fill blocks the grid where a line couldn't.
- 2026-08-19 — Phase 5 (Today) built. `features/recommendations/` (api+hooks for
  `GET /recommendations` and `GET /today`, confirmed exact contract against the backend
  first — `/today` does *not* return `availableMinutesToday`, only `/recommendations` does,
  so the page fetches both). `TaskCard` and its display constants (`PRIORITY_TEXT`,
  `PRIORITY_LABEL`, `StatusLabel`, `STATUS_ITEMS`) exported from `task-list.tsx` and reused
  directly for "Up Next", rather than a second, slightly-different card — a task looks and
  behaves identically whether viewed from `/tasks` or `/today`. The top-task card is the
  first real use of two conventions that were earmarked back when they were written but
  never actually used until now: `.animate-pulse-glow` ("the handful of elements that should
  feel alive at rest, e.g. the Today page's top-task card") and `useCompleteTask` (kept
  unused since the task-card redesign specifically "for a likely future single-action 'mark
  done' affordance... e.g. the Today page's top-task card"). The engine's "reason" string
  gets the deliberate one use of accent-magenta-as-insight-signal DESIGN.md already
  documented ("this is an AI/insight moment" callouts) — not a new color decision, just the
  first place that convention actually applied. `d` marks the top task done from the
  keyboard (this page's entire premise is "here's the one thing to do," so finishing it
  earns a direct shortcut, not just a button); `n` for new task, for parity. Every task
  mutation hook (`features/tasks/hooks.ts`) now also invalidates `["today"]`/
  `["recommendations"]`, not just `["tasks"]` — completing/editing/deleting a task from
  *anywhere* can change what Today should rank, not just actions taken from Today itself.
- 2026-08-19 — **Bug fixed**: `computeAvailableMinutesToday` (`recommendations.service.ts`)
  had its logic inverted — it summed not-yet-elapsed *commitment* minutes and returned that
  as the "available" figure, i.e. it reported how busy you are, not how free you are.
  User-reported: showed "4h 50m free" at 4:40am with commitments covering 12am–8am and
  9:30–11am, when actual free time was closer to 14.5 hours. Worse case, not reported but
  found while verifying the fix: a **completely free day with zero commitments returned 0
  minutes available** (the summing loop just never runs), the exact opposite of correct.
  Fixed: `available = (minutes remaining in the day) − (not-yet-elapsed commitment minutes)`,
  floored at 0. Verified `scoreFit`/`buildReason` (`scoring.ts`) both already assume "bigger
  number = more free time, task fits more easily" — the correct semantics — so no other code
  needed to change, only this one function's formula. Confirmed the fix numerically against
  the exact reported scenario (4:40am, 290 not-yet-elapsed commitment minutes, 870 available
  minutes returned = 14h30m) before shipping.
- 2026-08-19 — Phase 6 (Settings) built. Confirmed the exact `PATCH`/`DELETE /auth/me`
  contract first (`auth.validation.ts`): email is immutable (not in the schema at all), name
  optional (trimmed, 1-100 chars), timezone optional (validated via `Intl.DateTimeFormat`
  construction, not a static list), delete requires only a `password` field, wrong password
  is a 401 "Invalid password" (indistinguishable from a no-password/OAuth-only account).
  Timezone picker is a `Command`+`Popover` combobox per the plan — populated via
  `Intl.supportedValuesOf("timeZone")`, deliberately different from the backend's own
  `isValidTimeZone` check (that one avoids this exact API since it's missing some real-world
  aliases; here the job is populating a *searchable pick-list*, where a comprehensive
  standard list is the right tool — typing an alias directly would still validate
  server-side even if it's not in this browse list). Kept `updateProfile`/`deleteAccount`
  toast-free in `features/auth/hooks.ts` and instead handled toasts at the page's call
  sites, matching auth's own established convention (already used by login/register) rather
  than the toast-inside-the-hook convention every other feature uses — auth hooks are reused
  across pages that each want different messaging, unlike a Task/Project/Schedule mutation
  hook used from one obvious page. Delete-account confirmation is an `AlertDialog` with an
  embedded password `Input` (per the plan) — doesn't auto-close on a failed attempt (wrong
  password), only a successful delete navigates away, same "closing is driven by this
  component's own state" pattern as every other delete flow in the app.
- 2026-08-19 — Phase 7 (polish pass). Audited every data-fetching page (Tasks/Projects/
  Schedule/Today) for a real gap: none checked a query's own `isError` — a failed fetch
  (network blip, backend down) silently fell through to that page's *empty*-state copy
  ("No tasks match these filters," "Fully free," "You're all caught up"), misrepresenting a
  failure as genuinely having no data. Added a shared `components/query-error-state.tsx`
  (message + a "Try again" button wired to the query's own `refetch`) and wired it into all
  four pages — Today shows one error state covering topTask/upNext/commitments together
  (all three come from the same `/today` query, so they fail together, not independently).
  Also fixed a styling inconsistency found in the same pass: every delete-confirmation
  `AlertDialogAction` (Tasks, Projects, Schedule, Today) was using the default button
  variant, not `destructive` — only Settings' delete-account confirmation had it right.
  Fixed everywhere. Full clean rebuild (`tsc --noEmit`, `eslint`, `next build`) across the
  whole frontend confirms nothing regressed. This closes out the original approved frontend
  build plan (Phases 0-7) in full.
- 2026-08-19 — User-found during their own manual pass: a shift spanning midnight (e.g.
  Monday 4pm-2am) couldn't be entered — `ScheduleBlock.startTime`/`endTime` are minutes
  within a single calendar day (0-1439), so `endTime < startTime` was rejected. Fixed in the
  **create** form only: an end time earlier than the start time is now treated as "spans
  midnight" and auto-split into two real same-day blocks (today's evening half + tomorrow's
  early-morning half, with correct day-of-week wraparound), reusing the existing multi-day
  batch-create path (`useCreateScheduleBlocks`). No data-model or backend change — overlap
  detection, the daily timeline, the availability calc, and Today's commitments all needed
  zero changes, since each half is an ordinary single-day block from their point of view.
  Edit mode keeps the strict same-day check (operates on one existing block, can't represent
  half of a spanning pair). Toast copy now counts distinct days touched, not raw block
  count, so a single overnight entry reads "for 2 days" correctly rather than misleadingly.
  Full reasoning in `frontend/DESIGN.md`.
- 2026-08-19 — Follow-up bug caught same-day: the overnight split above was losing exactly
  1 minute per commitment. `endTime` shared `startTime`'s 0-1439 range, capping the evening
  half at 11:59 PM instead of true midnight (1440). User-reported: a week of overnight
  shifts totaled 4 minutes short of what was entered. Fixed at the schema level
  (`schedule.validation.ts`) — `startTime` stays 0-1439, `endTime` now allows up to 1440
  (a block can legitimately end exactly at midnight; starting exactly at midnight-of-next-
  day would be meaningless). Frontend split updated to use `endTime: MINUTES_PER_DAY`
  (1440). Verified numerically before shipping: 9pm-2am now splits into exactly 3h00m +
  2h00m = 5h, matching the entered range (previously 2h59m + 2h00m = 4h59m).
- 2026-08-19 — User-reported friction: managing an overnight commitment's two halves
  manually (edit both if the time changes, delete both to remove the whole shift). Presented
  four options (leave as-is, smarter delete only, frontend-only heuristic merge, proper
  backend link); user chose the backend link — most robust, avoids the heuristic-merge
  risk of two genuinely unrelated commitments matching the same-label/adjacent-day/midnight
  pattern by coincidence. Added `ScheduleBlock.pairId` (nullable, indexed, client-generated
  via `crypto.randomUUID()` — an opaque grouping tag, not a real FK/relation) via a single
  additive migration, no backfill needed. `createScheduleBlockSchema` accepts an optional
  `pairId` passthrough; `updateScheduleBlockSchema` deliberately does not, since editing a
  pair now always goes through delete+recreate (`useReplaceScheduleBlocks`), never a direct
  PATCH on a paired row. Editing reconciles by shape: a plain block staying a plain block
  still uses the existing simple PATCH (`useUpdateScheduleBlock`); anything where either
  side of the edit is a pair recomputes the needed block(s) and replaces the old one(s) —
  create-first (not delete-first) so a failed create never loses the original data, with a
  rollback of any partially-succeeded new blocks rather than leaving mixed old/new state.
  Schedule's row list now hides a pair's "tail" half (represented by its "head" half's row
  on the previous day, shown with the true combined range + an "overnight" tag) while the
  daily timeline and each day's committed-minutes total still use the raw per-day blocks
  (that day's actual occupied minutes genuinely include the tail). Weekly "N commitments"
  now counts `pairId ?? id` distinctly, so a pair reads as one commitment, not two. Full
  reasoning in `frontend/DESIGN.md`.
- 2026-08-19 — Schedule rebuilt as a week calendar grid (`WeekCalendar`), replacing the
  day-grouped list entirely (user chose "replace" over "toggle between both" when asked).
  User-reported: once real commitments piled up, a stacked list per day stopped being
  readable — a grid (days as columns, time-of-day as the vertical axis) is the standard
  shape for exactly this problem. Also confirmed: default-scrolled to roughly an hour before
  the week's earliest commitment (not always showing empty 2am-6am space), full 24h still
  reachable by scrolling. New `features/schedule/layout.ts` (`layoutDayBlocks`) gives
  overlapping commitments side-by-side lanes via a standard greedy interval-scheduling
  column layout — good enough for a personal schedule's realistic overlap counts, not
  solving optimal enterprise-calendar column-packing. Delete moved from a per-block dropdown
  menu (grid blocks can be too small to host one) into the edit Sheet's own footer, wired
  back up to the page's existing shared confirmation dialog. An overnight pair's two halves
  no longer need special "hide the tail, merge into the head's row" display logic — two
  ordinary segments across adjacent day columns already read correctly as one continuous
  shift, which is the grid doing for free what the list needed real logic for. Deleted
  `schedule-list.tsx` (fully superseded). Full reasoning in `frontend/DESIGN.md`.
- 2026-08-20 — Restyled `WeekCalendar` after user feedback that the first version was "the
  ugliest calendar I've seen... confusing where things start and end." Three real bugs, not
  just taste: translucent color-tinted block fills let the hour grid lines bleed through and
  look washed-out; the sticky header and scrollable body were separate elements, so a
  scrollbar on one but not the other could drift the day columns out of alignment with their
  headers; and blocks never showed an actual time range, only the label. Fixed: solid
  `bg-muted` blocks with color carried only by a left border + dot, one shared scroll
  container with the header `sticky` inside it (both axes now scroll together, columns can't
  disagree), a time-range line printed on each block when it's tall enough to fit one, and an
  opaque `bg-card` surface for the whole grid instead of the page's `.hud-grid-bg` texture
  showing through underneath it. Full reasoning in `frontend/DESIGN.md`.
- 2026-08-20 — Fixed an overnight pair's tail half showing a nonsense time range on its own
  day ("12:00 AM – 12:00 AM" instead of "12:00 AM – 2:00 AM") — the display logic read the
  partner's `endTime` unconditionally to find the "true" end, which is only correct for the
  head half (whose own `endTime` is always the `MINUTES_PER_DAY` placeholder); the tail's own
  `endTime` was already correct and didn't need substituting. Also added a continuation
  marker per user request (chevron on whichever corner touches midnight, plus squaring off
  that corner) so a pair reads as "one shift split by the day boundary" without needing to
  hover for the tooltip. Full reasoning in `frontend/DESIGN.md`.
- 2026-08-20 — Fixed editing an overnight pair from its tail half (the second day) prefilling
  garbage — wrong day, start/end both midnight. `commitmentBlocks` was built as
  `[block, partner]`, which only happens to be `[head, tail]` when the head is the one
  clicked; clicking the tail produced `[tail, head]`, and `ScheduleFormSheet`'s
  `valuesFromBlocks` unconditionally reads index 0 as the head. Fixed by ordering
  `commitmentBlocks` using the already-computed `isHead` flag instead of raw click order, so
  it's always `[head, tail]` regardless of which half was clicked.
- 2026-08-20 — Added click/drag-to-create on the calendar grid itself (user request), not just
  via the "New commitment" button — click empty grid space for a default 1h block, or drag to
  pick an exact range, both snapped to 15min and shown live via a dashed preview outline.
  Explicitly handles the next-day case per the user's request: clicking late enough that the
  default 1h block would cross midnight wraps the end time below the start
  (`(start + 60) % MINUTES_PER_DAY`), the same shape the manual form already treats as
  "spans midnight," so it flows into the existing auto-split/pairing logic with no
  special-casing. Found and fixed a related latent bug in the same pass: an end time of
  exactly `"00:00"` was being treated as a genuine span into tomorrow (creating a real block
  plus a zero-length tail, `startTime === endTime === 0`, on the next day) instead of what it
  actually means — "ends precisely at midnight," representable as a single same-day block
  ending at `MINUTES_PER_DAY`. Reachable via this new feature (a click near 11pm defaults to a
  1h block landing exactly on midnight) even though the pre-existing manual time inputs rarely
  produced it deliberately; all three affected call sites (`blocksForDay`, `willSpan`,
  `spansMidnight`) now special-case `end === 0` consistently. Full reasoning in
  `frontend/DESIGN.md`.
