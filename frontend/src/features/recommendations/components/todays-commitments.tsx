"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatClockTime } from "@/lib/time";
import type { ScheduleBlock } from "@/types";

interface TodaysCommitmentsProps {
  commitments: ScheduleBlock[];
}

// Ticks every 30s so the "now" highlight below moves on to the next
// commitment on its own, without needing a manual refresh — same reasoning
// as CurrentCommitmentBanner's identical hook (kept local to each
// component rather than shared/prop-drilled; two independent 30s
// intervals cost nothing this page cares about).
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

// Read-only here — editing a commitment is Schedule's job (/schedule), not
// Today's. This is just "what's fixed today" context for deciding what to
// work on in the free time around it.
export function TodaysCommitments({ commitments }: TodaysCommitmentsProps) {
  const nowMinutes = useNowMinutes();

  if (commitments.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Fully free — nothing scheduled today.</p>;
  }

  const sorted = [...commitments].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="space-y-1.5">
      {sorted.map((block) => {
        const isNow = nowMinutes >= block.startTime && nowMinutes < block.endTime;
        return (
          <div
            key={block.id}
            className={cn(
              "flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm text-card-foreground ring-1 ring-foreground/10",
              // Mirrors CurrentCommitmentBanner above — this row and that
              // banner describe the same commitment, so they shouldn't
              // look like two unrelated pieces of information.
              isNow && "ring-accent-cyan/40",
            )}
          >
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {formatClockTime(block.startTime)} – {formatClockTime(block.endTime)}
            </span>
            <p className="min-w-0 flex-1 truncate font-medium">{block.label}</p>
            {isNow && (
              <span className="shrink-0 rounded-sm border border-accent-cyan/30 bg-accent-cyan/10 px-1.5 py-0.5 font-mono text-[10px] text-accent-cyan">
                Now
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
