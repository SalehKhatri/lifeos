"use client";

import { useEffect, useState } from "react";
import { formatClockTime, formatDuration } from "@/lib/time";
import { hashLabelToColor } from "@/lib/colors";
import type { ScheduleBlock } from "@/types";

interface CurrentCommitmentBannerProps {
  commitments: ScheduleBlock[];
}

// Ticks every 30s (not once per render) — this page is meant to be glanced
// at throughout the day, not just loaded once each morning, so "ends in
// 12m" and which commitment even counts as "current" both need to stay
// right without a manual refresh.
function useNowMinutes(): number {
  const [minutes, setMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return minutes;
}

// User-requested: "if current time some commitment are going on display
// the info about it at top." Renders nothing when nothing's active right
// now — same as TodaysCommitments below it, an empty/inactive state here
// is itself real information (you're free) and shouldn't show a hollow
// placeholder. Filters (not `.find`s) commitments' current membership —
// the app deliberately allows overlapping commitments elsewhere (Schedule
// warns rather than blocks), so more than one can legitimately be "now" at
// once, however rare.
export function CurrentCommitmentBanner({ commitments }: CurrentCommitmentBannerProps) {
  const nowMinutes = useNowMinutes();
  const active = commitments.filter(
    (b) => nowMinutes >= b.startTime && nowMinutes < b.endTime,
  );

  if (active.length === 0) return null;

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
    </div>
  );
}
