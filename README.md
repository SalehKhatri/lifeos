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
