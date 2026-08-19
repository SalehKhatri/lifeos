# LifeOS

A personal productivity system whose core feature is a deterministic task recommendation
engine — it answers "what should I work on right now?" given deadlines, priority, and
available time.

Full locked scope: [`docs/MVP_SPEC.md`](docs/MVP_SPEC.md). Current status per feature:
[`docs/PROGRESS.md`](docs/PROGRESS.md).

## Stack

| Layer    | Choice                                    |
| -------- | ------------------------------------------ |
| Backend  | Node.js + Express + TypeScript + Prisma     |
| Frontend | Next.js + TypeScript + Tailwind             |
| Database | PostgreSQL                                  |
| Auth     | JWT, delivered via httpOnly cookie          |

Two separate services in one repo, no monorepo tooling — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the backend's modular-monolith structure
and module coupling rules.

## Status

| Module | Status |
| --- | --- |
| Auth (register/login/logout/profile/delete) | ✅ Done |
| Categories (list/create/rename/delete) | ✅ Done |
| Tasks (CRUD + complete, filterable) | ✅ Done |
| Projects (CRUD, auto progress %) | ✅ Done |
| Schedule (recurring weekly availability, CRUD) | ✅ Done |
| Prioritization Engine (`/recommendations`) | ✅ Done |
| Today View (`/today`) | ✅ Done |
| Frontend | 🔲 Not started (default `create-next-app` output) |

Full detail, notes, and decisions: [`docs/PROGRESS.md`](docs/PROGRESS.md).

## API

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me
PATCH  /auth/me
DELETE /auth/me

GET    /tasks              # ?status=&priority=&categoryId=&projectId=
POST   /tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id
POST   /tasks/:id/complete

GET    /categories
POST   /categories
PATCH  /categories/:id
DELETE /categories/:id

GET    /projects           # ?status=
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id

GET    /schedule            # ?dayOfWeek=
POST   /schedule
PATCH  /schedule/:id
DELETE /schedule/:id

GET    /recommendations     # ranked tasks + reason string, see docs/MVP_SPEC.md §5 for the formula
GET    /today                # top task + up to 3 "up next" + today's fixed commitments
```

A documented Postman collection (`LifeOS API`, with request/response examples and error
tables per endpoint) is kept in sync with this list — ask if you need access.

## Repo layout

```
lifeos/
├── backend/     Express + TypeScript + Prisma API — src/modules/<feature>/
├── frontend/    Next.js + TypeScript + Tailwind app
└── docs/        MVP_SPEC.md, ARCHITECTURE.md, PROGRESS.md
```

## Getting started

### Prerequisites

- Node.js
- A local PostgreSQL instance

### Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev
npm run dev             # http://localhost:4000
```

Required env vars (see `.env.example`):

| Var             | Required | Notes                                              |
| --------------- | -------- | --------------------------------------------------- |
| `DATABASE_URL`  | Yes      | Postgres connection string                          |
| `JWT_SECRET`    | Yes      | 32+ characters                                      |
| `PORT`          | No       | Defaults to `4000`                                  |
| `NODE_ENV`      | No       | Defaults to `development`                           |
| `CORS_ORIGIN`   | No       | Defaults to `http://localhost:3000`                 |
| `JWT_EXPIRES_IN`| No       | Defaults to `7d`                                    |

### Frontend

```bash
cd frontend
npm install
npm run dev              # http://localhost:3000
```

## Docs

- [`docs/MVP_SPEC.md`](docs/MVP_SPEC.md) — locked scope: what's in v1, what's explicitly deferred
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module structure, coupling rules, conventions
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — current status per feature, known issues, decisions log
- [`CLAUDE.md`](CLAUDE.md) — instructions/conventions for Claude Code sessions working in this repo
