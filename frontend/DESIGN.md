# LifeOS Frontend — Design System

Current direction: a "blend" cyberpunk theme — cyan as the primary HUD color, magenta and
amber reserved as deliberate secondary accents, dark-only for v1. This file exists because
the visual direction is expected to change later (see Decisions Log, 2026-08-19) — everything
below is written so re-skinning the app means editing values in one or two files, not hunting
through every component.

**The one rule that matters most:** component code never hardcodes a color, shadow, or
animation duration. Everything comes from a token (Tailwind class backed by a CSS variable)
or from `lib/motion.ts`. If a component needs a color that doesn't have a token yet, add the
token — don't inline a hex/oklch value.

## Where things live

| What | File |
| --- | --- |
| Color tokens, radius, fonts | `src/app/globals.css` — `:root` (dormant light theme, untouched shadcn defaults) and `.dark` (the actual active theme) |
| Glass/glow/grid utility classes | `src/app/globals.css` — `@layer components` |
| Ambient/continuous CSS animation (e.g. glow pulse) | `src/app/globals.css` — `@keyframes` |
| JS-driven animation variants/timing | `src/lib/motion.ts` |
| Generated shadcn components (own the source, customize freely) | `src/components/ui/` |

## Color tokens

Standard shadcn tokens (`background`, `foreground`, `card`, `primary`, `secondary`, `muted`,
`accent`, `destructive`, `border`, `ring`, ...) are used exactly as shadcn intends —
`--accent`/`--secondary`/`--muted` stay tasteful, muted neutrals for ordinary hover/focus
states. **`--primary` is the cyan.**

Three extra tokens layered on top, deliberately kept separate from the generic hover slots so
neon is reserved for moments that should actually stand out, not sprinkled on every hover:

- `--accent-cyan` (`bg-accent-cyan`, `text-accent-cyan`, ...) — same value as `--primary`,
  exposed under a clearer name for use outside button contexts (e.g. an active nav
  indicator, a glowing border).
- `--accent-magenta` — secondary highlight. Use for: urgent-priority signals, "this is an
  AI/insight moment" callouts. Not a default hover color.
- `--accent-amber` — warnings / due-soon signals. Same rule: deliberate, not default.

Each has a matching `-foreground` token for text/icons placed on a solid fill of that color.

## Glow, glass, and grid

- `.glow-cyan` / `.glow-magenta` / `.glow-amber` — box-shadow glow + matching border color.
  Apply to the one or two elements per screen that should draw the eye (the Today page's top
  task, an urgent badge) — not every card, or it stops meaning anything.
- `.glass-panel` — translucent background + blur, for HUD-style panels. Opt-in, not the
  default `Card` background (keeps ordinary cards cheap to render — `backdrop-filter` isn't
  free, especially on scrolling surfaces).
- `.hud-grid-bg` — faint CSS-gradient grid backdrop. Apply to large static containers only
  (e.g. the authenticated layout shell's background), never to individual cards or anything
  that scrolls/repaints often.
- `.animate-pulse-glow` — continuous ambient pulse, pure CSS `@keyframes` (not
  Motion/JS) — cheaper to run forever. Reach for this on the handful of elements that
  should feel "alive" at rest, e.g. the Today page's top-task card.

## Animation (`lib/motion.ts`)

Direction: **subtle & snappy** — animation reinforces an action, it doesn't add ceremony to
something you'll do 50 times a day. Retune globally by editing `TRANSITION_FAST`/
`TRANSITION_BASE` in that file, not by hunting down individual component durations.

- `fadeInUp` — default entrance for cards/rows.
- `staggerContainer` — wrap a list with this, `fadeInUp` on each child, for a staggered
  entrance.
- `scaleIn` — a touch more motion, for hero moments (e.g. the Today page's top task reveal).
- Rule of thumb: animate `transform`/`opacity` only (GPU-friendly, no layout thrashing).
  Anything continuous/ambient (glows, pulses) is CSS `@keyframes`, not Motion — Motion is for
  enter/exit and interaction-driven transitions.
- `globals.css` has a global `prefers-reduced-motion` override that collapses all
  animation/transition durations to ~0 — this applies regardless of what any component does,
  so no per-component reduced-motion handling is needed.

### Microinteractions — established conventions (2026-08-19)

**Standing principle, confirmed by user 2026-08-19: this app should feel genuinely
interactive, not just styled.** Default to reactive/proximity/cursor-driven effects over
static binary hover states wherever an element reasonably supports it — the cursor-as-torch
effect below (something reacts continuously to *where you are*, not just *whether you're
hovering it*) is the reference example, not a one-off flourish confined to the auth pages.
When building Tasks/Projects/Schedule/Today/Settings in later phases, actively look for
places this fits (card hover glow that tracks cursor position within the card, not just an
on/off state; a button that leans/brightens toward the cursor; anything else in that spirit)
rather than defaulting to plain Tailwind `hover:` classes out of habit. Keep it "subtle &
snappy" per the animation direction above — reactive, not gratuitous.

The following are the baseline for every future page, not just auth — reuse them rather than
reinventing per component:

- **Field-level validation errors** (`components/form-field.tsx`) animate in/out
  (height+opacity via `AnimatePresence`) with a small `CircleAlert` icon — never a bare
  `<p className="text-destructive">` that just pops into existence. These stay inline,
  right under their field — small, expected, don't meaningfully shift layout.
- **Toast copy: past-tense action + the identifying name, quoted — never a generic phrase
  like "Task updated successfully."** `Created "Buy groceries"`, `Deleted category "Work"`,
  `Couldn't delete "Buy groceries"` — a toast should be readable on its own, in a list of
  several, without needing to remember what you just clicked. Error toasts follow the same
  shape as a fallback (`Couldn't <verb> "<name>"`), only used when the backend didn't already
  return a specific message (`err instanceof ApiError ? err.message : fallback` — the backend's
  own message wins when there is one). Mutation hooks take the full entity (`Task`/`Category`),
  not just an id, specifically so the identifying name is available for this — see
  `features/tasks/hooks.ts`/`features/categories/hooks.ts`. Apply this to every new mutation
  hook (Projects/Schedule/Settings in later phases), not just Tasks/Categories.
- **Status-only changes never show a success toast** (`useSetTaskStatus`/`useCompleteTask` in
  `features/tasks/hooks.ts`) — only errors. A status click (however it's triggered — a
  checkbox, a toggle, the card's status `Select`) is frequent and low-stakes; the UI updating
  is its own feedback. This has to be symmetric across every direction a status can change,
  or it reads as an inconsistent bug, not a feature — this was caught once already (reopening
  a task toasted "Task updated" while completing it toasted nothing, because reopen was
  piggybacking on the generic `useUpdateTask` mutation, which correctly *does* toast for an
  actual form save). If a future status-changing control needs this treatment, route it
  through `useSetTaskStatus`, not a one-off mutation.
- **API-level errors are a toast (`sonner`'s `toast.error(...)`), not an inline `Alert`.**
  Tried an animated inline `Alert` banner first (shadcn's own "auth screen" recipe
  suggests it) — in practice, an API error growing the Card taller on submit is a bad
  feel, and it was the one inconsistent spot in the app: every other mutation
  (task/project/etc. save/delete failures) was always going to be a toast. Corrected
  2026-08-19 after user feedback. Rule: field errors inline, API/server errors toast.
- **Every text input/textarea/select** (`components/ui/input.tsx`, `textarea.tsx`,
  `select.tsx`) glows on focus (`focus-visible:shadow-glow-cyan`, transitioning
  `box-shadow` alongside color/border) — a systemic fix at the component-source level, not
  per-page. Any future custom form control should match this.
- **Auth pages use `components/auth-layout.tsx`** — ambient blurred glow orbs + a
  two-column branding panel (hidden on mobile, where the Card's own small wordmark header
  carries branding instead) + a `scaleIn` entrance for the card. A page that's "just a
  centered form" reads as empty for this aesthetic — give it atmosphere.
- **Cursor-as-torch**: the ambient glow orbs brighten based on cursor proximity (closer =
  brighter, via a distance falloff — see `TORCH_RADIUS`/`proximityOpacity` in
  `auth-layout.tsx`). Implemented with `useMotionValue` + `useSpring`, not `useState` —
  `pointermove` fires constantly, and a `useState` update per pixel of mouse movement would
  re-render the tree that often; motion values write directly to the DOM instead. The
  spring is what makes both the live-following motion *and* the settle-back-to-dim on
  pointer-leave feel natural, rather than needing separate logic for each. Respects
  `prefers-reduced-motion` (skips updating target values entirely, orbs stay static-dim).
  Reusable pattern for any other ambient decoration that should react to the cursor later.
- **No icons in the primary nav, no avatar.** Lucide dashboard icons (`LayoutDashboard`,
  `ListTodo`, ...) paired with filled hover-pills reads as generic SaaS-admin, not
  Jarvis/HUD — corrected 2026-08-19 after user feedback. Nav links are text-only
  (`font-heading`, tracking-widest, uppercase) with a **shared glowing underline that
  slides between items** via Motion's `layoutId` (`nav-active-indicator` in
  `(app)/layout.tsx`) when the active route changes — animated and reactive, not a static
  highlight. Inactive links get a faint underline preview on hover (scales in from
  `scale-x-0`), foreshadowing the active state rather than a filled background. The user
  menu trigger is plain text (name/email) + a chevron, not an avatar circle — there's no
  profile picture anywhere in this app, so an initials-in-a-circle represents nothing and
  just looks like unfinished decoration. Small utility icons (gear, logout) are still fine
  *inside* the dropdown itself — that's a conventional, backgrounded surface, not the
  prominent nav row, so it doesn't carry the same "dashboard" read.
- **Command palette (`components/command-palette.tsx`) icons, chosen deliberately, not
  defaulted to the first semantically-plausible option** — unlike the primary nav, a
  command palette is a conventionally icon-heavy pattern (VSCode, Raycast, Linear, ...)
  since icons aid scanning a vertical list fast; the "no icons" nav rule above doesn't
  extend here. `Target` for Today (focus/"work on this right now", not the more
  generic-AI-magic `Sparkles`), `ListChecks` for Tasks (more precise checkmark than
  `ListTodo`'s consumer-to-do-app read), `FolderKanban`/`CalendarClock`/`Settings`/`LogOut`
  kept as-is — already clear, professional, not generic. Reconsider each new icon this
  deliberately rather than grabbing the first lucide match for the word.
- **Task card (`features/tasks/components/task-list.tsx`), redesigned 2026-08-19 after direct
  user feedback that an earlier HUD-heavy version (corner-tick brackets, a cursor-follow
  radial glow, a checkbox *plus* a separate near-invisible status dot) was visually busy, hard
  to scan, and unclear what was actually clickable.** Current version, and the standing
  lesson for every future list row in this app: **every visible element should either carry
  real information or be an unambiguous control — nothing purely decorative.**
  - **One status control for the whole lifecycle**, not two competing ones. A `Select`
    (`STATUS_ITEMS`/`StatusLabel` in `task-list.tsx`) replaced the checkbox + toggle-dot pair
    — a `Select`'s own chevron makes "this is a dropdown, click it" obvious at a glance, which
    a bare 6px dot never did. Covers `TODO`/`IN_PROGRESS`/`DONE` uniformly through
    `useSetTaskStatus`, including `DONE` — confirmed against the backend
    (`tasks.service.ts`'s `updateTask`) that `PATCH /tasks/:id` already manages `completedAt`
    correctly on any status transition, so there's no need to special-case `DONE` through the
    dedicated `/complete` endpoint here (that endpoint's `useCompleteTask` hook is kept for a
    likely future single-action "mark done" affordance, e.g. the Today page's top task, where
    a one-directional action is the better fit than a 3-way dropdown).
  - **Priority earns a visible signal only when it's HIGH/URGENT** — a colored left border,
    nothing for LOW/MEDIUM (previously *every* row got some edge treatment, even if muted;
    now most rows get none, so the ones that do actually stand out). Priority's text label
    stays for every row regardless (small, muted unless HIGH/URGENT) — the color signal is
    reserved, the information itself never is.
  - **No purely-decorative elements**: the corner-tick brackets and cursor-follow radial glow
    from the previous version are gone entirely — they conveyed no information, only added
    visual weight, which is exactly what "too busy" was pointing at. The "reactive, not
    static" microinteraction principle (see above) still applies to controls that do
    something (the status `Select`, hover states with real affordance) — it was never meant
    to justify decoration for its own sake, and this was the concrete correction for reading
    it that way.
  - **Two-line hierarchy**: status + title + row menu on the first line; priority, deadline,
    duration, category, project on a second, uniformly muted metadata line — ordered
    objective-facts-first (priority/deadline/duration), then organizational tags
    (category/project), instead of an undifferentiated wrapped row where everything competed
    for the same attention.
  - Category/project chips unchanged in spirit from before: category uses its own color
    dynamically (`${color}1a` background tint, `${color}40` border, via inline `style` — a
    per-category color can't be a static Tailwind class); project uses a fixed accent-cyan
    tint + `FolderKanban` icon, since it's structural (one fixed meaning) rather than
    user-colored.
  - **De-cluttering isn't the same as de-personalizing** — immediate next-round feedback was
    "lost the jarvis vibe." The fix wasn't reintroducing the removed decoration; it was
    noticing that **typography identity had been flattened along with it**: the priority
    label had lost its `font-heading` tracked-uppercase treatment (the app's "technical/HUD
    voice" tier, see the type system below) down to a plain `font-medium` span during the
    rewrite — restored, since that's free (a font choice, no new element) and was doing real
    identity work. Also added: a cheap CSS-only `hover:` glow on the whole card
    (`hover:shadow-glow-cyan hover:ring-accent-cyan/30`, no pointermove/JS — "reactive," per
    the standing microinteraction principle, doesn't require cursor-tracking math every
    time), a permanent faint cyan border on the status control at rest (reads as a system
    widget, not a generic dropdown, intensifying to a full tint when actually in progress),
    and a genuine `shadow-glow-magenta` on `URGENT` tasks specifically — the one priority
    tier rare/important enough to earn an always-on glow, matching the glow convention's own
    "reserved for the one or two things that should draw the eye" rule rather than
    reintroducing it everywhere.
- **`Badge`'s radius fixed from shadcn's default pill (`rounded-4xl`) to `rounded-sm`** — a
  full pill reads as a generic SaaS tag, at odds with the sharper `--radius` token this theme
  already chose specifically for a more precise/HUD feel. `Badge` isn't currently used
  anywhere (the task card's chips above are bespoke, not `Badge`) — kept fixed regardless,
  since whatever first reaches for it next (a Projects/Schedule status pill, most likely)
  should inherit the right shape automatically rather than needing this rediscovered.
- **`/tasks` productivity pass (2026-08-19)** — the reference for what "more UX, not more
  decoration" means on a list page: real numbers, sort/search over the actual data, and
  keyboard shortcuts, not additional visual flourish.
  - **Deadline urgency** (`lib/datetime.ts`'s `getDeadlineUrgency`) is a distinct signal from
    Priority — priority is a user opinion, urgency is a fact that changes on its own as time
    passes. A `LOW`-priority task that's actually overdue still needs to visually stand out.
    Calendar-day comparison (not a rolling 24h window), matching the Prioritization Engine's
    own local-day bucketing convention on the backend. Overdue → `text-destructive` (reusing
    the existing "something's wrong" semantic, not inventing a new color); due-today →
    `text-accent-amber` (the token's own documented purpose — warnings/due-soon). Normal stays
    plain `text-muted-foreground`, unchanged.
  - **Stats line** above the list (`"12 tasks shown · 2 overdue · 1 due today"`) reflects
    whatever's currently visible (filters + search applied), not a separate global count —
    it should always describe what's on screen, not require mental cross-referencing.
  - **Search + sort are entirely client-side** (`features/tasks/sort.ts`) over the
    already-fetched, already-server-filtered (status/priority/category) list — no new backend
    endpoint for either. Fine at this scale (one user's task list), and keeps this feature
    frontend-only. Sort defaults to soonest-deadline-first, not creation order — surfacing
    what's actually urgent is the more useful default for a page whose whole point is getting
    things done.
  - **Page-level shortcuts**: `/` focuses search, `n` opens the create Sheet — bare keys, no
    modifier (same reasoning as the command palette's digit-jump: a modifier combo would risk
    colliding with a browser/OS-owned shortcut, a bare key doesn't). Guarded by an
    `isTypingTarget` check so a task title can still freely contain either character while an
    input has focus.
  - **Gotcha hit while wiring the command palette's "New Task" → `/tasks?new=1` bridge**:
    `react-hooks/set-state-in-effect` (a real React 19 lint rule, not a style nit) flags
    calling a `useState` setter directly inside a `useEffect` body. The fix isn't to suppress
    it — derive the value during render instead, via `useState`'s **lazy initializer**
    (`useState(() => Boolean(searchParams.get("new")))`), which runs once at mount with no
    extra render. The effect is then only responsible for cleaning the param back out of the
    URL (`router.replace`) — a genuine external-system action, not a local `setState` call, so
    the rule doesn't (and shouldn't) flag it. This pattern — "read a URL param into initial
    state via lazy init, clean up via a separate effect" — is the template for any future
    query-param bridge (Projects/Schedule quick-actions from the palette will hit the same
    shape).
- **Command palette instant-select: bare digit keys (1-9), not mnemonic letters or
  Cmd+letter.** The search input is focused by default when the palette opens, so a bare
  letter shortcut would just get typed as a query character instead of firing — and
  Cmd/Ctrl+letter collides with shortcuts the *browser itself* already owns (⌘T new tab,
  ⌘W close tab, ⌘S save, ...), which a web app can't safely reclaim. Digits are
  `preventDefault`-ed while the palette is open so they never land in the input either —
  deliberate tradeoff: this palette is navigation, not free-text/numeric search, so giving
  up "type a digit as a query" costs nothing real. `COMMANDS` in
  `command-palette.tsx` is a single data-driven array (label/icon/group/action) that both
  renders the list and assigns shortcut numbers positionally — extend that array for new
  commands (Phase 2's "New Task", etc.), don't hand-maintain two parallel lists. Numbers
  are positional (shift if you reorder/insert commands) — acceptable for a handful of
  items, revisit if the list grows enough that this becomes annoying. Selected-row
  highlight uses `accent-cyan` (edited directly in `components/ui/command.tsx`'s shared
  `CommandItem`, not just this palette) instead of shadcn's default generic muted
  background, and the dialog has a footer hint bar (↑↓ · ↵ · 1-9 · ESC) — command
  palettes should teach their own shortcuts inline, not rely on the user already knowing.
- **Projects (`features/projects/`)** deliberately reuses every convention above rather than
  inventing page-specific ones: the toast copy convention, the no-toast status-only mutation
  pattern (`useSetProjectStatus`, same shape as `useSetTaskStatus`), the `Select.Value` items
  gotcha, the `?new=1` command-palette bridge. The one real layout difference from Tasks is
  intentional, not an oversight: a responsive Card **grid**, not a dense list — projects are
  fewer in number and meant to be scanned "at a glance" (progress, status), unlike a working
  task list you scroll and act on repeatedly. Applied the task-card lesson *proactively*
  here instead of waiting to be told: one explicit status `Select` per card from the start,
  no checkbox/dot split to later regret.
- **"View a project's tasks" is a lean bridge into the Tasks page, not a
  `/projects/[id]` detail page.** User question: does it make sense to see project-wise
  tasks? Yes, and it was a real gap — `Task.projectId` was filterable on the backend and
  even in the frontend's `TaskFilters` type, but nothing in either page's UI exposed it.
  Rather than build a second task-list UI inside a project detail page (duplicating search/
  sort/urgency/status-control that Tasks already has), added a Project filter to `TaskFilters`
  (same pattern as Category) and made each project card's task-count a real `<Link>` to
  `/tasks?projectId=X`, read via `useState`'s lazy initializer on the Tasks page (same
  pattern as the `?new=1` bridge). Deliberately *not* stripped from the URL afterwards,
  unlike `?new=1` — a filter is worth keeping bookmarkable/shareable/refresh-safe, unlike a
  one-shot "open this sheet" signal.
- **Schedule (`features/schedule/`)** reuses the same conventions (toast copy, `Select.Value`
  items map, `?new=1` bridge) but a genuinely different layout: **grouped by day, all 7 days
  always rendered**, not a list or grid you filter down — the whole point (per the original
  plan) is seeing the whole week's shape at a glance, and an empty day ("fully free") is real
  information worth showing, not a state worth hiding. Today's section gets a small accent-cyan
  label + "Today" tag (the one thing on this page that's objectively special, so it's the one
  thing that gets a color treatment — same "glow/color reserved for what matters" rule as
  everywhere else). Time fields are native `<input type="time">` (already includes a time
  picker as part of the browser's own control) converted to/from the backend's
  minutes-since-midnight via `lib/time.ts` — a new commitment defaults to the *next full hour*
  on today's day-of-week (not the exact current minute — "3:47 PM–4:47 PM" reads oddly for a
  recurring commitment), computed fresh on open like Task/Project deadlines defaulting to
  "now". No nullable-on-update fields on `ScheduleBlock`, so the create/update payload split
  documented above (Tasks/Projects) isn't needed here — one shared payload object is fine.
- **Schedule productivity pass (2026-08-19)**, four additions after "we can work a bit more
  on schedule" — all real information or real friction reduction, none of it decoration:
  - **Multi-day quick-create.** The Day field is a row of toggle buttons, not a `Select` —
    create mode allows selecting several at once (e.g. "Work" for Mon-Fri in one action,
    instead of creating the identical block 5 times); edit mode still behaves as a
    single-select (a click replaces the selection) since it operates on one existing block.
    Backed by `useCreateScheduleBlocks` (plural — takes an array, always, even for a single
    day), which fires the creates via `Promise.allSettled` and reports one consolidated
    toast rather than one per day. `allSettled`, not `all`: if one create in the batch fails
    (rare — the payload's validity doesn't depend on which day it's for), the ones that
    succeeded shouldn't be hidden by treating the whole batch as failed.
  - **Overlap warning** (`features/schedule/overlap.ts`) — purely client-side, since the
    backend deliberately allows overlapping blocks on the same day (`docs/MVP_SPEC.md` #4 —
    left to the recommendation engine's interval merging, not Schedule's job at write time).
    O(n²) pairwise interval check per day, not sort-then-check-adjacent-pairs: a long block
    can fully contain a short one with an unrelated third block in between after sorting by
    start time, which an adjacent-only check would miss. Small per-day block counts make
    O(n²) free. Surfaced as an amber "Overlap" tag on the day header plus a warning icon on
    each affected row — a warning, not a validation error, so it never blocks saving.
  - **Per-block color coding** (`lib/colors.ts`'s `hashLabelToColor`) — deterministic, not
    random, unlike `randomCategoryColor`: the same label always resolves to the same color
    across renders/reloads, without needing an actual color field on `ScheduleBlock` (it has
    none). Same saturation/lightness band as the app's other generated colors, but fixed
    rather than ranged, so two labels that happen to hash near the same hue don't also drift
    apart in vividness.
  - **Daily timeline bar** — a compact 24h strip per day showing each block as a proportional
    colored segment (same `hashLabelToColor` as the row list, so the timeline and the
    detailed rows read as one system, not two independent colorings of the same data), plus a
    thin marker for the current time on today's strip. Lets you see a day's actual shape
    ("morning free, afternoon packed") at a glance instead of reading every time range as
    text — the whole reason this page groups by day in the first place, taken one step
    further.
  - **Day sections needed a real fill, not a border — the page's `.hud-grid-bg` texture ate
    the divider.** `space-y-4` between 7 stacked day groups read as one continuous list
    (user feedback: "everything blends together"); a `border-b` fix attempted first didn't
    help either, for a reason specific to this page: the authenticated shell's background
    grid texture sits right behind `/schedule`, and a 1px line just blends into that existing
    grid instead of reading as a boundary. Fixed with an actual fill per day
    (`rounded-lg bg-muted/20 p-3`) — an opaque-enough panel blocks the grid and reads as a
    real section, which a border can't do against a textured background. Kept deliberately
    subtle (`bg-muted/20`, not `bg-card`) so it doesn't read as a card containing cards — the
    commitment rows inside are still the more prominent `bg-card` surface; this is just the
    group they sit in, one visual tier below.
- **Today (`app/(app)/today/`)** is where two conventions written earlier in this document
  finally get used for the first time, rather than new ones being invented: `.animate-pulse-glow`
  (earmarked back when it was added — "the handful of elements that should feel alive at
  rest, e.g. the Today page's top-task card") on the hero card, and `useCompleteTask`
  (deliberately kept unused through the task-card redesign specifically for this — "a likely
  future single-action 'mark done' affordance... e.g. the Today page's top-task card"). The
  engine's "reason" string (why this task, specifically) is the one place accent-magenta's
  documented "AI/insight moment" callout convention actually applies — not a new color
  decision, the first real use of an old one. `TaskCard` (and its display constants —
  `PRIORITY_TEXT`, `PRIORITY_LABEL`, `StatusLabel`, `STATUS_ITEMS`) are exported from
  `features/tasks/components/task-list.tsx` and reused directly for "Up Next," rather than a
  second, slightly-different card component — a task should look and behave identically
  whether you're looking at it from `/tasks` or `/today`. `d` marks the top task done from
  the keyboard — this page's entire premise is "here's the one thing to do right now," so
  finishing it earns a direct shortcut, not just a button click. Every task mutation now also
  invalidates `["today"]`/`["recommendations"]` (`features/tasks/hooks.ts`'s
  `invalidateTaskRelated`), not just `["tasks"]` — completing/editing/deleting a task from
  *anywhere* in the app can change what Today should rank next.
- **Settings (`app/(app)/settings/`)** introduces this app's first standalone `Command`+
  `Popover` combobox — the command palette also composes these two, but as a `CommandDialog`
  triggered globally, a structurally different job from an inline field inside a form. The
  timezone list is populated via `Intl.supportedValuesOf("timeZone")`, deliberately *not*
  the backend's own `isValidTimeZone` approach (`auth.validation.ts` avoids that exact API
  since it's missing some real-world aliases the backend still wants to accept) — this is a
  different job, populating a *searchable pick-list*, where a comprehensive standard list is
  the right tool; typing an alias directly would still validate server-side even if it isn't
  in this browse list. `updateProfile`/`deleteAccount` (`features/auth/hooks.ts`) stay
  toast-free and are handled at the page's own call sites instead — matching auth's existing
  convention (already used by login/register), not the toast-inside-the-hook convention
  every other feature (Tasks/Categories/Projects/Schedule) uses. That's a deliberate
  exception, not a lapse: auth hooks get reused across pages that each want different
  messaging (a login failure and a delete-account failure shouldn't necessarily read the
  same way), unlike a Task/Project/Schedule mutation hook that's really only ever called
  from one obvious page.

- **Filter bars collapse behind one "Filters" `Popover` once there are more than ~2-3
  axes**, rather than showing every `Select` inline — four always-visible filters
  (status/priority/category/project) on `/tasks`, right after Project became the fourth, was
  reported as overwhelming. Pattern: a single trigger button with a count badge (visible only
  when ≥1 filter is active — the "are filters on?" question is real information and stays
  answerable at a glance, it just doesn't need every control visible to answer it), a
  "Clear all" action, and the individual `Select`s stacked with labels inside (reusing
  `components/form-field.tsx`, not inventing a new label style). A filter bar with only one or
  two axes (Projects' status filter, for now) doesn't need this — reach for it once a third
  axis is about to be added, not preemptively.
- **Toolbar row bug, fixed 2026-08-19: mismatched control heights read as "ugly."** The
  Filters `Popover` trigger was `size="sm"` (`h-7`) while the search `Input` and Sort
  `Select` sat at their default `h-8` — three controls in one `items-center` row at two
  different heights, which is the kind of thing that "looks off" without being easy to name.
  Fixed by explicitly setting `h-8` on all three (Input has no size-variant system, unlike
  `Select`/`Button`, so it's a plain className override there — worth remembering next time a
  toolbar mixes `Input` with `Select`/`Button`, since only the latter two default to a
  consistent height across variants). Also fixed: the search box's wrapping `div` had a
  stray `w-full` fighting its own `max-w-56`, which — inside a `flex flex-wrap` row — made it
  want to claim the full row width instead of behaving like a fixed-width item alongside its
  siblings; changed to a plain `w-56 shrink-0`. Added a vertical `Separator` between the
  Filters trigger and the Sort `Select` to visually group "narrowing the list" from "ordering
  it" — two different jobs that were previously just floating next to each other with no
  visual distinction.
- **Toolbar shortcuts, `/tasks`**: `/` → focus search, `n` → new task, `f` → toggle the
  Filters popover, `s` → cycle sort order (deadline → priority → newest → deadline...).
  Visible `kbd` hints sit next to/inside the controls that have room for one (the New Task
  button, the Filters trigger, the search box's idle-state hint) — Sort's hint sits beside
  the `Select` rather than inside its trigger, since cramming a badge into an already-tight
  dropdown trigger would undercut the exact "toolbar looks busy" complaint this pass was
  fixing. `n` was also added to `/projects` for parity — "master control" is a standing
  app-wide principle, not something to reintroduce per-page only when asked.
- **Sort re-order now animates (`layout` prop on each task row's `motion.div`).** User
  report: cycling sort changed the dropdown's value but the list looked unchanged. Code
  review found the sort logic itself correct (comparators, `useMemo` deps, prop wiring all
  checked out) — the real issue was almost certainly that React *does* reorder the DOM
  correctly, but does it instantly with no transition, which is easy to miss on a short list.
  Adding `layout` gives Framer Motion's FLIP animation on any position change, making a
  re-order visually unambiguous regardless of list length — a good default for any list that
  can reorder itself, not just this one.
- **Form validation messages should never surface Zod's raw default text.** Two forms
  (`TaskFormSheet`, `ProjectFormSheet`) had fields with no custom `error`/message — `title`/
  `name`/`description`'s `.max()` checks, and `estimatedDuration`'s base type check. The
  latter was the concrete bug: clearing the duration number input produces `NaN` (not
  `undefined`), and Zod's raw default for that is something like "Invalid input: expected
  number, received NaN" — exactly the kind of message a user shouldn't ever see. Fixed by
  passing `{ error: "..." }` to `z.number()` for the base check, and a plain string second
  argument to every `.min()`/`.max()` (Zod v4 syntax — the shorthand string arg is sugar for
  `{ error }`). Rule going forward: every constraint on every form schema gets an explicit,
  plain-language message — never rely on Zod's default for anything user-facing.
- **Deadline fields default to right now, not empty**, on create (`TaskFormSheet`,
  `ProjectFormSheet`) — computed fresh inside the `open`/`task` reset effect (`new
  Date().toISOString()` through the existing `toDatetimeLocalValue` helper), not baked into
  the static `EMPTY_VALUES` constant, so it's actually "now" every time the sheet opens, not
  frozen to whenever the module first loaded. Picking a deadline from a genuinely blank field
  means setting both date and time from scratch every time; starting from "now" (still fully
  editable, one click away from being changed to whatever the real deadline is) is a better
  anchor. Native `<input type="datetime-local">` already includes a time picker as part of
  the browser's own control — no separate time-picker component needed for this.

## Radius & type

- `--radius: 0.375rem` — slightly sharper than shadcn's default `0.625rem`, for a more
  precise/HUD feel without going fully sharp-cornered (which reads harsh at this density of
  UI). Single value, cascades everywhere via `--radius-sm/md/lg/xl/...`.
- **Four-tier type system**, decided 2026-08-19 (see Decisions Log) — each tier has its own
  Tailwind utility class, all loaded via `next/font` in `layout.tsx`:
  - `font-brand` (Orbitron) — the "LIFEOS" wordmark **only**. Too wide/blocky for anything
    smaller (task titles, labels) — don't reach for it beyond the wordmark.
  - `font-heading` (Chakra Petch) — headings *and* small uppercase tracked labels (e.g.
    `TOP RECOMMENDED TASK`, `UP NEXT`). Both are the same "micro-heading" tier, just
    different sizes — this is the technical/HUD "voice" of the interface.
  - `font-sans` (Geist Sans, the Tailwind default — no class needed) — body/secondary text:
    task descriptions, reason strings, muted helper text, form inputs. The highest-volume,
    most-read text in the app, so it stays on the font actually built for dense UI reading
    rather than a display face.
  - `font-mono` (Geist Mono) — data-like elements only: scores, timestamps, durations, IDs.
    Reinforces the "readout" feel. Don't use it for labels — that's `font-heading`'s job.
  - Gotcha: all four are set by **literal font family name** in `globals.css`'s
    `@theme inline` block (e.g. `"Chakra Petch", "Geist", ...`), not
    `var(--font-chakra-petch)`. Tailwind v4's `@theme inline` resolves at parse time, so
    referencing a runtime-injected `next/font` CSS variable there doesn't work reliably —
    a known shadcn + Tailwind v4 + Next.js gotcha, not a stylistic choice.

## Component gotchas (this shadcn CLI version)

This project's shadcn install (CLI 4.18.0) uses `@base-ui/react` for some components
(`Button`, `Badge`, `DropdownMenu`, ...), which isn't a drop-in match for the Radix-based
examples you'll find in most shadcn docs/tutorials online. Differences actually hit so far:

- **`DropdownMenuLabel`/`DropdownMenuItem` require a `DropdownMenuGroup` ancestor.** Unlike
  Radix, where `Label` works standalone, Base UI throws `MenuGroupContext is missing` at
  runtime (not a type error — only shows up when you actually open the menu) if you skip the
  `Group` wrapper. Always wrap: `<DropdownMenuGroup><DropdownMenuLabel/>...items...
  </DropdownMenuGroup>`. Caught 2026-08-19 in the nav shell's user menu — check every new
  `DropdownMenu` usage (task/project/schedule row actions in later phases) for this.
- **No `asChild` prop.** Base UI's polymorphism story is a `render` prop, not Radix's
  `asChild`. Rather than fight that per-component, the nav's dropdown menu items use
  `onClick={() => router.push(...)}` instead of wrapping a real `<Link>` — fine for a small
  settings/logout menu, but use real `<Link>`s for anything that should be a proper anchor
  (primary nav, anything worth right-click-open-in-new-tab).
- **No `form.tsx`** — this version's `form` registry entry is an empty stub. Forms are
  composed directly with `react-hook-form` + `Label`/`Input`/`Select`, via the shared
  `components/form-field.tsx` wrapper (label + input + error message).
- **`Avatar` has no `size` prop** — size via Tailwind classes (`className="h-8 w-8"`), not a
  variant prop.
- **`Select.Value` shows the raw value, not the label, until the popup has mounted its items
  at least once.** Base UI resolves a selected value to a label by looking it up in items
  registered by mounted `Select.Item`s — if the popup was never opened (pre-filled filters
  defaulting to "all", or a form pre-filled for edit), there's nothing to look up yet, so the
  trigger shows the raw sentinel/enum value/id instead of a readable label. Fix: pass
  `Select`'s (i.e. `Select.Root`'s) `items` prop — a plain `{ value: label }` map — and it
  resolves immediately regardless of mount state. Do this for every `Select` whose value can
  be set programmatically (filters, edit-mode form fields) — caught 2026-08-19 on the task
  filters (`__all__` sentinel showing literally) and the task form's category select (showing
  the category id). Build the map dynamically for data-driven options (e.g.
  `Object.fromEntries(categories.map(c => [c.id, c.name]))`).
- **Create schemas want a field *omitted* for "empty"; update schemas want it explicitly
  `null`.** Both the Tasks and Projects backend modules define nullable-looking optional
  fields (`description`, `deadline`, `categoryId`, `projectId`) as `z.string().optional()` on
  **create** (undefined/omitted only — `null` fails validation with Zod's raw "expected
  string, received null") but `z.string().nullable().optional()` on **update** (`null` is
  the correct way to explicitly clear a previously-set value). `TaskFormSheet` originally
  built one shared payload object with a hardcoded `?? null` fallback for both branches —
  correct for update, wrong for create, and surfaced as exactly that raw Zod message the
  moment someone submitted a new task without a category or project. Fixed by building the
  base values with `undefined` fallbacks (safe for create, since `JSON.stringify` drops
  `undefined` keys entirely — see `lib/api-client.ts`) and only coercing to `null` in the
  update branch specifically. `ProjectFormSheet` already did this correctly by accident (its
  create/update branches were never merged into one shared object) — the general rule going
  forward: never share one payload object across create and update for a resource with any
  nullable-on-update field; branch it, or coalesce to `null` only inside the update path.

## Re-skinning later

Because every component reads tokens instead of hardcoded values, a full re-skin is:
1. Change the values inside `.dark` in `globals.css` (and/or add a new theme class following
   the same variable names, if you want more than one selectable theme later).
2. Adjust `lib/motion.ts` if the new direction wants a different animation feel.
3. Nothing in `components/` or any page needs to change.

If a future theme needs a genuinely new *kind* of token (not just new values for an existing
one), add it to both the `@theme inline` block and `.dark` in `globals.css`, then document it
in this file — keep this file as the single source of truth for "what tokens exist and when
to reach for which one."
