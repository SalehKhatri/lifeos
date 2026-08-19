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
