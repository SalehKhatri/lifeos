"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DAY_LABELS,
  MINUTES_PER_DAY,
  formatClockTime,
  formatHourLabel,
} from "@/lib/time";
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
//
// First pass at this used a translucent color-tinted fill for blocks and
// split the sticky header from the scrollable body into two elements —
// both turned out to be mistakes (user feedback: "ugliest calendar I've
// seen... confusing where things start and end"). Fixed here: blocks are
// solid (bg-muted, not a color wash) so hour lines never bleed through
// them, the header and grid share one scroll container so columns can
// never drift out of alignment, the whole thing sits on an opaque bg-card
// surface instead of the page's hud-grid-bg texture showing through, and
// every block prints its actual time range as text instead of relying on
// eyeballing position against the hour gutter.
const HOUR_HEIGHT = 56; // px — tall enough for a 30min block to fit a time line + label
const GRID_HEIGHT = HOUR_HEIGHT * 24;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
// Below this height a block only has room for one truncated line — time and
// label share it. At or above it, the time range gets its own small line on
// top so "when does this start/end" never requires reading the axis.
const TWO_LINE_THRESHOLD = 34;

interface WeekCalendarProps {
  blocks: ScheduleBlock[];
  // The commitment's full block set — 1 for an ordinary block, 2 for an
  // overnight pair (resolved via pairId before calling this).
  onEdit: (blocks: ScheduleBlock[]) => void;
}

function findPartner(
  block: ScheduleBlock,
  all: ScheduleBlock[],
): ScheduleBlock | undefined {
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
    // A single scroll container for both axes, with the header row `sticky`
    // *inside* it — not a separate element sitting above a second scroll
    // container. That was the previous version's real bug: two independent
    // boxes meant the vertical scrollbar could eat width from one but not
    // the other, so day columns silently drifted out of alignment with
    // their headers. One box means the header scrolls horizontally with the
    // grid (so columns can never disagree) while staying pinned vertically.
    <div
      ref={scrollRef}
      className="max-h-140 overflow-auto rounded-lg bg-card ring-1 ring-foreground/10"
    >
      <div className="min-w-180">
        <div className="sticky top-0 z-20 flex border-b border-border bg-card">
          <div className="w-12 shrink-0 border-r border-border" />
          {DAY_LABELS.map((dayName, dayOfWeek) => {
            const isToday = dayOfWeek === today;
            return (
              <div
                key={dayOfWeek}
                className={cn(
                  "flex-1 border-l border-border px-2 py-2 text-center first:border-l-0",
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

        <div className="flex mt-3">
          {/* Hour labels */}
          <div className="w-12 shrink-0 border-r border-border">
            {HOURS.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
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
                  "relative flex-1 border-l border-border first:border-l-0",
                  isToday && "bg-accent-cyan/5",
                )}
                style={{ height: GRID_HEIGHT }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    aria-hidden
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: h * HOUR_HEIGHT }}
                  />
                ))}

                {isToday && (
                  <div
                    aria-hidden
                    className="absolute inset-x-0 z-10 border-t-2 border-accent-cyan"
                    style={{
                      top: (nowMinutes / MINUTES_PER_DAY) * GRID_HEIGHT,
                    }}
                  />
                )}

                {laidOut.map(({ block, lane, laneCount }) => {
                  const partner = findPartner(block, blocks);
                  // The head half is always stored ending at exactly
                  // MINUTES_PER_DAY (midnight) by construction — that's a
                  // placeholder, not the real end, so its *display* end has
                  // to come from the tail's endTime instead. The tail's own
                  // endTime is already the true end (it was never capped),
                  // so it needs no substitution — using `partner.endTime`
                  // unconditionally for both halves was the bug: it made
                  // the tail show its head's placeholder end (midnight) as
                  // its own, producing a nonsense "12:00 AM – 12:00 AM".
                  const isHead = Boolean(partner) && block.endTime === MINUTES_PER_DAY;
                  const isTail = Boolean(partner) && block.startTime === 0;
                  // Always ordered [head, tail], regardless of which half
                  // was actually clicked — ScheduleFormSheet's
                  // valuesFromBlocks unconditionally reads index 0 as the
                  // head (its start is the commitment's real start) and
                  // index 1 as the tail (its end is the real end). Clicking
                  // the tail used to pass [block, partner] = [tail, head],
                  // silently feeding the form the wrong day/start/end.
                  const commitmentBlocks = !partner
                    ? [block]
                    : isHead
                      ? [block, partner]
                      : [partner, block];
                  const displayEnd = isHead && partner ? partner.endTime : block.endTime;
                  const top = (block.startTime / MINUTES_PER_DAY) * GRID_HEIGHT;
                  const height =
                    ((block.endTime - block.startTime) / MINUTES_PER_DAY) *
                    GRID_HEIGHT;
                  const width = 100 / laneCount;
                  const left = lane * width;
                  const color = hashLabelToColor(block.label);
                  const twoLines = height >= TWO_LINE_THRESHOLD;
                  const timeText = `${formatClockTime(block.startTime)} – ${formatClockTime(displayEnd)}`;

                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => onEdit(commitmentBlocks)}
                      title={`${block.label} · ${timeText}${partner ? " (continues onto the next day)" : ""}`}
                      // Solid bg-muted, not a translucent tint of the label
                      // color — a wash-of-color fill let the hour lines
                      // bleed straight through it and made every block look
                      // washed-out against the page's grid backdrop. Color
                      // identity now lives only in the left border + dot,
                      // same "accent, not a flood" convention as the rest
                      // of the app. The edge that touches midnight is
                      // squared off (not rounded) on whichever half has one
                      // — a continuing shift shouldn't look like it has a
                      // rounded, finished corner where it doesn't.
                      className={cn(
                        "absolute overflow-hidden rounded-md border-l-[3px] bg-muted px-1.5 py-1 text-left ring-1 ring-foreground/10 transition-colors hover:ring-accent-cyan/40",
                        isHead && "rounded-b-none",
                        isTail && "rounded-t-none",
                        // Reserves room for the continuation chevron so a
                        // long truncated label's ellipsis never visually
                        // runs underneath it.
                        (isHead || isTail) && "pr-3.5",
                        overlapping.has(block.id) && "ring-accent-amber/60",
                      )}
                      style={{
                        top,
                        height: Math.max(height, 18),
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        borderColor: color,
                      }}
                    >
                      {/* Continuation marker — a chevron pointing the
                          direction the shift keeps going, sitting inside
                          the box (not straddling the edge: the button
                          clips overflow for its truncated text, so
                          anything positioned outside its bounds would just
                          get cut off) and anchored to the right so it
                          never collides with the dot + label anchored
                          left. Makes "this is one half of a longer shift"
                          visible without needing to hover for the tooltip. */}
                      {isHead && (
                        <ChevronDown
                          aria-hidden
                          className="absolute right-1 bottom-0.5 size-3 text-muted-foreground"
                        />
                      )}
                      {isTail && (
                        <ChevronUp
                          aria-hidden
                          className="absolute top-0.5 right-1 size-3 text-muted-foreground"
                        />
                      )}
                      {twoLines ? (
                        <>
                          <span className="block truncate font-mono text-[9px] leading-tight text-muted-foreground">
                            {timeText}
                          </span>
                          <span className="flex items-center gap-1">
                            <span
                              aria-hidden
                              className="size-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="truncate text-[11px] leading-tight font-medium text-foreground">
                              {block.label}
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span
                            aria-hidden
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate text-[11px] leading-tight font-medium text-foreground">
                            {block.label}
                          </span>
                        </span>
                      )}
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
