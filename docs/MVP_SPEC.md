# LifeOS — MVP Spec

Locked scope for v1. Anything not listed here is explicitly deferred (see "Out of Scope").
This file should change rarely — if scope needs to shift, edit it deliberately, not silently.

## Stack

| Layer    | Choice                                            |
| -------- | ------------------------------------------------- |
| Frontend | Next.js + TypeScript                              |
| Backend  | Node.js + Express + TypeScript (separate service) |
| Database | Postgres (ORM: TBD)                               |
| Auth     | JWT-based, email/password                         |

## MVP Feature Set

### 1. Auth

- Register, login, logout, delete account (password re-entry required)
- Edit profile (name, timezone)
- JWT-based sessions (delivered via httpOnly cookie)
- Protected routes
- Design so more providers _could_ be added later (no work needed now)

User profile: `name` (optional, for display/greetings) and `timezone` (IANA
string, defaults to UTC, frontend auto-detects via
`Intl.DateTimeFormat().resolvedOptions().timeZone`). Changing timezone is a
display/interpretation preference only — it does not shift any existing
Task/Project deadlines (those stay fixed instants). See `docs/PROGRESS.md`
Decisions Log.

### 2. Tasks

Fields: title, description, status, priority, category, estimated_duration,
deadline, created_at, completed_at.

Actions: create, edit, delete, complete.

Category is user-extensible, not a fixed enum (see Categories below) — decided
2026-08-13 when the schema was built, see `docs/PROGRESS.md` Decisions Log.

### 2a. Categories

Fields: name, color (optional hex, for UI badges).

A small seeded set of defaults (Work, Personal, Health, Learning, Admin, Other),
shared across all users, plus each user can add their own custom categories on
top. Actions: list (defaults + own), create own, rename/recolor own, delete own
(defaults can't be renamed/recolored/deleted). Category names are unique
per-user (case-insensitive) across defaults + own — added 2026-08-14 when the
Tasks module was built, see `docs/PROGRESS.md` Decisions Log.

### 3. Projects

Fields: name, description, status, deadline.
Progress = % of associated tasks completed (auto-calculated, not stored).
Actions: list/create/edit/delete (`DELETE /projects/:id` added 2026-08-16 — not
in the original locked list, added alongside Tasks/Categories which both
support real delete; see `docs/PROGRESS.md` Decisions Log). Deleting a project
un-links its tasks (`projectId` → null), doesn't delete them.

### 4. Availability (simplified calendar)

Recurring weekly blocks only: day_of_week, start_time, end_time, label.
No events, meetings, or external calendar sync yet.

Actions: list/create/edit/delete (`PATCH /schedule/:id` added 2026-08-16 —
not in the original locked list, added for consistency with Tasks/Categories/
Projects which all support edit; unlike Category, nothing references
ScheduleBlock via FK so this is a pure convenience add, no cascade
implications). `startTime` must be before `endTime` (validated on
create/update, including after merging a partial update with the existing
record). Overlapping blocks on the same day aren't prevented at write time —
if that ever matters, it's the Prioritization Engine's job to merge
overlapping intervals when computing available time, not Schedule's.

### 5. Prioritization Engine

Deterministic scoring using: deadline urgency, priority, duration fit vs. available time.
Output: ranked task list + short plain-language reason per task.

### 6. Today View

- Top recommended task
- "Up next" (2–3 tasks)
- Today's fixed commitments (from availability blocks)

## Database Entities (v1)

```
User          — id, email, name?, timezone (default UTC), password_hash?, created_at
Category      — id, user_id? (null = shared default), name, color?, created_at, updated_at
Task          — id, user_id, project_id?, category_id?, title, description,
                status, priority, estimated_duration, deadline, created_at,
                updated_at, completed_at
Project       — id, user_id, name, description, status, deadline, created_at,
                updated_at
ScheduleBlock — id, user_id, day_of_week, start_time, end_time, label,
                created_at, updated_at
```

## API Surface (v1)

```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
GET    /auth/me
PATCH  /auth/me
DELETE /auth/me

GET    /tasks
POST   /tasks
GET    /tasks/:id
PATCH  /tasks/:id
DELETE /tasks/:id
POST   /tasks/:id/complete
# GET /tasks supports optional ?status=&priority=&categoryId=&projectId= filters

GET    /categories
POST   /categories
PATCH  /categories/:id
DELETE /categories/:id

GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
# GET /projects supports optional ?status= filter

GET    /schedule
POST   /schedule
PATCH  /schedule/:id
DELETE /schedule/:id
# GET /schedule supports optional ?dayOfWeek= filter

GET    /today
GET    /recommendations
```

## Out of Scope for v1 (deferred, not forgotten)

- Recurrence, task dependencies, energy-level matching, tags, snooze/duplicate
- Full "Areas" entity + time-tracking dashboard
- Full daily plan auto-generation (only ranked recommendations for v1)
- Natural language task creation
- AI assistant / LLM integration
- Notifications
- Analytics & behavioral learning
- Adaptive scheduling (duration prediction)
- Finance / Fitness / Meal planning / Career tracker / Academic tracker modules
- Keyboard shortcuts, command palette
- Password reset ("forgot password") and email verification — both need a
  transactional email provider, which isn't decided yet. Revisit together
  when email-sending is actually needed (see `docs/PROGRESS.md` Decisions Log,
  2026-08-14). Known gap, deliberately deferred, not an oversight.
