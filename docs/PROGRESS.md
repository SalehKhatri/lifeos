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
| Create schedule block     | ✅     | `startTime < endTime` validated |
| Edit schedule block       | ✅     | `PATCH /schedule/:id` — added beyond original locked API surface, see Decisions Log; time-order re-validated against merged (existing + new) values |
| Delete schedule block     | ✅     |       |
| List/filter schedule      | ✅     | `GET /schedule?dayOfWeek=`, ordered by day then start time |
| Compute today's free time | ✅     | `recommendations.service.ts`'s `computeAvailableMinutesToday` — sums not-yet-elapsed block minutes for today; overlaps not merged (known simplification) |

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
| Frontend Today page | 🔲     |       |

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
