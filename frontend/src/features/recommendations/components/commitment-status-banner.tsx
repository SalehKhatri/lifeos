import { formatClockTime, formatDuration } from "@/lib/time";
import { hashLabelToColor } from "@/lib/colors";
import type { ScheduleBlock } from "@/types";

interface CommitmentStatusBannerProps {
  commitments: ScheduleBlock[];
  nowMinutes: number;
}

// User-requested (2026-08-20): "if current time some commitment are going
// on display the info about it at top" — later extended with a forward-
// looking "next up" line and a contiguous free-time figure (both
// user-selected follow-ups, see docs/PROGRESS.md). Renders nothing when
// there's neither an active commitment nor anything left today — same "an
// inactive state is itself real information" reasoning as
// TodaysCommitments' own empty state; the page's own "X free today" stat
// already covers "you're free the rest of today."
export function CommitmentStatusBanner({ commitments, nowMinutes }: CommitmentStatusBannerProps) {
  // Plural, not `.find` — the app deliberately allows overlapping
  // commitments elsewhere (Schedule warns rather than blocks), so more
  // than one can legitimately be active at once, however rare.
  const active = commitments.filter((b) => nowMinutes >= b.startTime && nowMinutes < b.endTime);
  const next = commitments
    .filter((b) => b.startTime > nowMinutes)
    .sort((a, b) => a.startTime - b.startTime)[0];

  if (active.length === 0 && !next) return null;

  return (
    <div className="space-y-1.5">
      {active.map((block) => {
        const color = hashLabelToColor(block.label);
        const remaining = block.endTime - nowMinutes;
        return (
          <div
            key={block.id}
            className="flex items-center gap-3 rounded-lg border-l-[3px] bg-card px-3 py-2 text-sm ring-1 ring-foreground/10"
            style={{ borderColor: color }}
          >
            <span
              aria-hidden
              className="size-2 shrink-0 animate-pulse rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="shrink-0 font-heading text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Now
            </span>
            <p className="min-w-0 flex-1 truncate font-medium">{block.label}</p>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              ends {formatClockTime(block.endTime)} · {formatDuration(remaining)} left
            </span>
          </div>
        );
      })}

      {/* Two framings of the same "next" fact depending on whether
          anything's active right now: a compact reminder if you're
          already busy (the "Now" row above already answers "am I free
          right now"), or the lead fact itself — how much *contiguous*
          free time is actually usable before it starts — if you're not.
          The latter is deliberately distinct from the page's own "X free
          today" stat, which totals scattered remaining minutes across the
          whole day rather than the one uninterrupted block starting right
          now. */}
      {active.length > 0 && next && (
        <p className="px-1 font-mono text-xs text-muted-foreground">
          Next: {next.label} at {formatClockTime(next.startTime)} · in{" "}
          {formatDuration(next.startTime - nowMinutes)}
        </p>
      )}

      {active.length === 0 && next && (
        <div className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm ring-1 ring-foreground/10">
          <span className="shrink-0 font-heading text-[10px] font-semibold tracking-widest text-accent-cyan uppercase">
            Free
          </span>
          <p className="min-w-0 flex-1 text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatDuration(next.startTime - nowMinutes)}
            </span>{" "}
            right now — then {next.label} at {formatClockTime(next.startTime)}
          </p>
        </div>
      )}
    </div>
  );
}
