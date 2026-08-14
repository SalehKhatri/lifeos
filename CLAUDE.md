# LifeOS — Instructions for Claude Code

## Project

LifeOS is a personal productivity system whose core feature is a deterministic task
recommendation engine — it answers "what should I work on right now?" given deadlines,
priority, and available time. Full scope: `docs/MVP_SPEC.md`.

## Stack

- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL — `backend/`
- Frontend: Next.js + TypeScript + Tailwind — `frontend/`
- Two separate services, one repo, no monorepo tooling.

## Architecture — read before writing backend code

Backend is a **modular monolith**. Full detail: `docs/ARCHITECTURE.md`. The one rule that
matters most:

> A module (`modules/tasks`, `modules/projects`, etc.) only imports another module's
> `index.ts`. Never reach into another module's service, controller, or Prisma calls
> directly. Dependencies flow one way — e.g. `recommendations` depends on `tasks`,
> `projects`, `schedule`, never the reverse.

Within a module: `routes` (HTTP wiring only) → `controller` (validate + shape response) →
`service` (business logic, only place that touches Prisma).

## Conventions

- Validate request bodies with `zod`.
- One centralized Express error middleware; services/controllers throw typed errors.
- Response shape: `{ data: ... }` on success, `{ error: { message, code } }` on failure.
- Load and validate all env vars once at startup; fail fast if something required is missing.
- No event bus / pub-sub — modules call each other's functions directly, in-process.
- Never run a Prisma query inside a loop (N+1 queries) — one query per code path, not
  per iteration. Fetch what you need with a single `findMany` (`where: { id: { in: [...] } }`),
  do any matching/diffing in memory, and write with a single `createMany`/`updateMany`
  (or `$transaction` when the writes must be atomic and per-row). This applies everywhere:
  services, seed scripts, one-off scripts.

## Workflow rules

- No TDD for this project. Basic integration tests can come later for the scoring engine
  specifically, not now.
- Stick to `docs/MVP_SPEC.md` scope. Do not build anything listed under "Out of Scope" unless
  explicitly asked, even if it seems like a natural extension.
- Don't introduce a new library, pattern, or architectural concept that isn't already in
  `docs/ARCHITECTURE.md` without flagging it first — favor the boring, simple option.
- After finishing a feature or fixing something notable, update the status table in
  `docs/PROGRESS.md` (Not Started / In Progress / Done / Needs Fix) and add a one-line entry
  to the Decisions Log if a real decision was made.
- When adding or changing a route, mirror it in Postman (`LifeOS API` collection, "My Workspace"
  on the individual account — not the "Saleh's Team" one): one folder per module, one request per
  route. For each request write/update the description (body schema, auth requirement, success
  response shape, error table) and keep at least one saved example response for the success case
  and one for a representative error.

## Docs

- `docs/MVP_SPEC.md` — locked scope: what's in v1, what's explicitly deferred
- `docs/ARCHITECTURE.md` — module structure, coupling rules, conventions in detail
- `docs/PROGRESS.md` — current status per feature, known issues, decisions log
