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
- **The task-complete checkbox's two directions (`useCompleteTask`/`useReopenTask`) are
  deliberately symmetric: neither shows a success toast**, only errors — a frequent, low-stakes
  checkbox toggle doesn't need a toast in either direction, and showing one only on the
  "undo" side (which is what happened when reopen briefly reused the generic `useUpdateTask`
  mutation) reads as an inconsistent bug, not a feature. If a future toggle-style action needs
  the same treatment, give it its own dedicated hook rather than piggybacking on a generic
  update mutation that has its own (correct, wanted) toast.
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
- **Task card (`features/tasks/components/task-list.tsx`)** is the reference example for
  turning an ordinary list row into something that reads as HUD, not admin-dashboard:
  a colored priority **edge stripe** on the left (glowing for HIGH/URGENT only, per the
  "reserved, not default" accent rule — LOW/MEDIUM stay a plain/cyan bar), **corner ticks**
  (small targeting-frame brackets, idle at low opacity, brightening on hover) instead of a
  plain bordered rectangle, and a **cursor-follow radial highlight** inside the card (written
  straight to CSS vars on the DOM node in the pointermove handler, not React state — same
  "don't re-render per pixel" reasoning as the auth pages' torch effect, just without needing
  a spring since this is a per-row effect, not an ambient one). Priority itself is a small
  tracked-uppercase text readout, not a filled `Badge` — the filled/glowing treatment already
  lives on the edge stripe, so repeating it as a pill would be redundant. Category and Project
  (once Phase 3 lands a way to set the latter — the `Task.project` relation already comes back
  from the API and is rendered if present) are chips instead: category uses its own color
  dynamically (`${color}1a` background tint, `${color}40` border, via inline `style`, since a
  per-category color can't be a static Tailwind class); project uses a fixed accent-cyan tint +
  `FolderKanban` icon, since it's structural (one fixed meaning) rather than user-colored. An
  `IN_PROGRESS` task also gets a small `animate-pulse` cyan dot next to its title — the list had
  no visual distinction between `TODO` and `IN_PROGRESS` before, only done-vs-not.
- **The complete checkbox is a real toggle, not a one-way action.** It was originally disabled
  once checked ("full status control via edit" was the escape hatch) — user feedback pointed
  out an accidental click had no easy way back. Unchecking now reverts the task to `TODO` via
  the same `useUpdateTask` mutation the edit form uses (not a special-cased revert). Also fixed
  while in there: the checkbox was fading to near-invisible when done, because the outer
  card's `opacity-60` and the checkbox's own `disabled:opacity-50` were compounding
  (0.6 × 0.5 ≈ 0.3 opacity) — the checkbox is the primary control here, so it now stays at full
  opacity always; only the title/metadata content wrapper dims (`opacity-70`) to signal "done."
- **`Badge`'s radius fixed from shadcn's default pill (`rounded-4xl`) to `rounded-sm`** — a
  full pill reads as a generic SaaS tag, at odds with the sharper `--radius` token this theme
  already chose specifically for a more precise/HUD feel. Single consumer at the time of the
  change (the task card above), so low-risk; do this once, systemically, rather than
  special-casing radius per usage.
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
