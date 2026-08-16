# LifeOS — Architecture & Conventions

Purpose: give any coding session (human or Claude Code) enough context to make
consistent decisions without re-deriving them each time.

## Repo Layout

```
lifeos/
├── backend/     Express + TypeScript + Prisma
├── frontend/    Next.js + TypeScript + Tailwind
└── docs/        MVP_SPEC.md, PROGRESS.md, ARCHITECTURE.md
```

Two folders, one repo. No monorepo tooling (no Turborepo/Nx) — unnecessary at this size.

## Backend Architecture: Modular Monolith

One deployable service, organized by feature/domain rather than by technical layer.
Chosen because the roadmap explicitly adds more domains later (Finance, Fitness, Career
Tracker, etc.) that need to plug into the recommendation engine without becoming entangled
with existing modules. Microservices would be overkill for a solo project — this gets the
loose coupling without the network/deployment overhead.

```
backend/src/
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── index.ts          ← public interface; only this is imported by other modules
│   ├── tasks/
│   ├── projects/
│   ├── schedule/
│   └── recommendations/      ← consumes tasks/projects/schedule via their index.ts
├── shared/
│   ├── middleware/           (error handler, auth middleware)
│   ├── db/                   (Prisma client singleton)
│   └── config/
├── app.ts
└── server.ts
```

Within each module:

```
routes      → HTTP wiring only. Map method+path to a controller function. No logic.
controller  → Parse/validate request, call the service, shape the response. No DB calls.
service     → Business logic lives here. Only place that talks to Prisma.
```

### Coupling rules (these are the point of this architecture)

- A module only imports another module's `index.ts`. Never reach into another module's
  `.service.ts`, `.controller.ts`, or Prisma models directly.
- Dependencies flow one way: `recommendations` depends on `tasks`, `projects`, `schedule` —
  never the reverse. No circular module dependencies.
- New domains (Finance, Fitness, Career Tracker, etc.) are added as new folders under
  `modules/` and plug into `recommendations` through the same `index.ts` pattern, without
  modifying existing modules.
- If a business rule needs an `if` statement, it belongs in a service, not a route or controller.

**Known, flagged exception:** `projects.service.ts` queries the `Task` table directly (for
`GET /projects` progress counts) instead of going through `modules/tasks`' `index.ts`. `tasks`
already depends on `projects` (index.ts) to validate a task's `projectId` on write — having
`projects` depend on `tasks` too, for this read, would be a real circular module dependency,
which is more strictly forbidden than a narrow, documented, read-only cross-table query.
User-approved 2026-08-16 (see `docs/PROGRESS.md` Decisions Log). If a third module ever needs
the same kind of cross-read, promote it into a proper aggregator instead of adding another
one-off exception.

## Conventions

- **Validation**: use `zod` schemas for request bodies, defined near the controller that uses them.
- **Error handling**: one centralized Express error-handling middleware. Services/controllers
  throw typed errors (e.g. `NotFoundError`, `ValidationError`); the middleware maps them to
  HTTP status codes. No scattered try/catch-and-format in every route.
- **Response shape**: keep responses flat and predictable, e.g. `{ data: ... }` for success,
  `{ error: { message, code } }` for failures. Consistency matters more than the exact shape.
- **Env config**: all config (DB url, JWT secret, port) via `.env`, loaded once at startup,
  validated at boot (fail fast if something required is missing).
- **Naming**: REST resources plural (`/tasks`, `/projects`), camelCase in code, snake_case
  reserved for DB columns if Prisma's default mapping requires it.

## Frontend

- App Router (Next.js), TypeScript, Tailwind, TanStack Query for server state.
- Keep pages thin — data fetching via hooks, UI in components, no business logic in JSX.
- Today page is the priority page. Everything else (Tasks, Projects, Schedule) can be simpler
  CRUD-style pages initially.

## Testing

No TDD for MVP. Once core flows (auth, task CRUD, scoring) are stable, add basic integration
tests for the scoring algorithm specifically — it's the part most likely to silently regress.

## Decisions Made

- Backend: Node.js + Express + TypeScript, separate service from frontend.
- Database/ORM: Postgres + Prisma (chosen for DX/speed on a small, stable v1 schema).
- Repo: single repo, two top-level folders, no monorepo tooling.
- Layering: routes → controllers → services → Prisma, business logic confined to services.
