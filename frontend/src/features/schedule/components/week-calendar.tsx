"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { DAY_LABELS, MINUTES_PER_DAY, formatHourLabel } from "@/lib/time";
import { hashLabelToColor } from "@/lib/colors";
import { findOverlappingIds } from "@/features/schedule/overlap";
import { layoutDayBlocks } from "@/features/schedule/layout";
import type { ScheduleBlock } from "@/types";

// Replaced the day-grouped list (frontend/DESIGN.md has the full history)
// once real usage — many commitments at once — made a stacked list per day
// hard to parse. A week grid (days as columns, time-of-day as the vertical
// axis) is the standard shape for this exact problem: position and size
// convey "when" and "how long" directly, and overlapping commitments are
// visually obvious (side-by-side lanes) rather than needing a separate
// "Overlap" warning badge to point it out.
const HOUR_HEIGHT = 48; // px — ~12-14 hours visible in a reasonable viewport
const GRID_HEIGHT = HOUR_HEIGHT * 24;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface WeekCalendarProps {
  blocks: ScheduleBlock[];
  // The commitment's full block set — 1 for an ordinary block, 2 for an
  // overnight pair (resolved via pairId before calling this).
  onEdit: (blocks: ScheduleBlock[]) => void;
}

function findPartner(block: ScheduleBlock, all: ScheduleBlock[]): ScheduleBlock | undefined {
  if (!block.pairId) return undefined;
  return all.find((b) => b.pairId === block.pairId && b.id !== block.id);
}

export function WeekCalendar({ blocks, onEdit }: WeekCalendarProps) {
  const today = new Date().getDay();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scrolls to roughly an hour before the week's earliest commitment on
  // mount, so the grid doesn't open showing a wall of empty 2am-6am space
  // by default — full 24h is still one scroll away. Defaults to 7am if
  // there's nothing scheduled yet.
  useEffect(() => {
    const earliest =
      blocks.length > 0 ? Math.min(...blocks.map((b) => b.startTime)) : 7 * 60;
    const scrollToMinute = Math.max(0, earliest - 60);
    scrollRef.current?.scrollTo({ top: (scrollToMinute / 60) * HOUR_HEIGHT });
    // Only on mount — a later commitment added elsewhere in the week
    // shouldn't yank the scroll position out from under someone already
    // looking at the grid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="overflow-x-auto rounded-lg ring-1 ring-foreground/10">
      <div className="min-w-180">
        {/* Day headers — outside the scrollable body, stays pinned above
            it. The 12-unit spacer matches the hour-label gutter below so
            headers line up with their columns. */}
        <div className="flex border-b border-border bg-muted/20">
          <div className="w-12 shrink-0" />
          {DAY_LABELS.map((dayName, dayOfWeek) => {
            const isToday = dayOfWeek === today;
            return (
              <div
                key={dayOfWeek}
                className={cn(
                  "flex-1 border-l border-border px-2 py-2 text-center",
                  isToday && "bg-accent-cyan/5",
                )}
              >
                <p
                  className={cn(
                    "font-heading text-xs font-semibold tracking-widest uppercase",
                    isToday ? "text-accent-cyan" : "text-muted-foreground",
                  )}
                >
                  {dayName.slice(0, 3)}
                </p>
              </div>
            );
          })}
        </div>

        <div ref={scrollRef} className="flex max-h-140 overflow-y-auto">
          {/* Hour labels */}
          <div className="w-12 shrink-0">
            {HOURS.map((h) => (
              <div
                key={h}
                className="relative border-r border-border text-right"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute top-0 right-1.5 -translate-y-1/2 font-mono text-[10px] text-muted-foreground">
                  {formatHourLabel(h)}
                </span>
              </div>
            ))}
          </div>

          {DAY_LABELS.map((_, dayOfWeek) => {
            const dayBlocks = blocks.filter((b) => b.dayOfWeek === dayOfWeek);
            const overlapping = findOverlappingIds(dayBlocks);
            const laidOut = layoutDayBlocks(dayBlocks);
            const isToday = dayOfWeek === today;

            return (
              <div
                key={dayOfWeek}
                className={cn(
                  "relative flex-1 border-l border-border",
                  isToday && "bg-accent-cyan/5",
                )}
                style={{ height: GRID_HEIGHT }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    aria-hidden
                    className="absolute inset-x-0 border-t border-border/50"
                    style={{ top: h * HOUR_HEIGHT }}
                  />
                ))}

                {isToday && (
                  <div
                    aria-hidden
                    className="absolute inset-x-0 z-10 border-t border-accent-cyan"
                    style={{ top: (nowMinutes / MINUTES_PER_DAY) * GRID_HEIGHT }}
                  />
                )}

                {laidOut.map(({ block, lane, laneCount }) => {
                  const partner = findPartner(block, blocks);
                  const commitmentBlocks = partner ? [block, partner] : [block];
                  const top = (block.startTime / MINUTES_PER_DAY) * GRID_HEIGHT;
                  const height = ((block.endTime - block.startTime) / MINUTES_PER_DAY) * GRID_HEIGHT;
                  const width = 100 / laneCount;
                  const left = lane * width;

                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => onEdit(commitmentBlocks)}
                      title={`${block.label}${partner ? " (overnight)" : ""}`}
                      className={cn(
                        "absolute overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-left text-[11px] leading-tight transition-[filter] hover:brightness-125",
                        overlapping.has(block.id) && "ring-1 ring-accent-amber/60",
                      )}
                      style={{
                        top,
                        height: Math.max(height, 16),
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        backgroundColor: `${hashLabelToColor(block.label)}30`,
                        borderColor: hashLabelToColor(block.label),
                      }}
                    >
                      <span className="block truncate font-medium text-foreground">
                        {block.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
