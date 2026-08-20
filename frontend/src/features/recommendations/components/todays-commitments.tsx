import { formatClockTime } from "@/lib/time";
import type { ScheduleBlock } from "@/types";

interface TodaysCommitmentsProps {
  commitments: ScheduleBlock[];
}

// Read-only here — editing a commitment is Schedule's job (/schedule), not
// Today's. This is just "what's fixed today" context for deciding what to
// work on in the free time around it.
export function TodaysCommitments({ commitments }: TodaysCommitmentsProps) {
  if (commitments.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Fully free — nothing scheduled today.</p>;
  }

  const sorted = [...commitments].sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="space-y-1.5">
      {sorted.map((block) => (
        <div
          key={block.id}
          className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm text-card-foreground ring-1 ring-foreground/10"
        >
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {formatClockTime(block.startTime)} – {formatClockTime(block.endTime)}
          </span>
          <p className="min-w-0 flex-1 truncate font-medium">{block.label}</p>
        </div>
      ))}
    </div>
  );
}
