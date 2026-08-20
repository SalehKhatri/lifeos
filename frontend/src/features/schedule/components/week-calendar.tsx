"use client";

import { useEffect, useRef, useState } from "react";
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
// Click/drag-to-create snaps to the nearest quarter hour — fine enough to
// place a block precisely, coarse enough that a slightly unsteady drag
// still lands on a clean time.
const DRAG_SNAP_MINUTES = 15;
// A press-and-release with less movement than this is a plain click, not a
// drag — defaults to a 1h block starting there instead of a near-zero
// length one.
const MIN_DRAG_MINUTES = 15;

// Both pure and module-level (not component closures) so the mount-long
// mousemove/mouseup listeners below can call them without becoming
// react-hooks/exhaustive-deps dependencies.
function minuteFromClientY(el: HTMLDivElement, clientY: number): number {
  const rect = el.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
  const raw = ratio * MINUTES_PER_DAY;
  // Clamped below MINUTES_PER_DAY, not up to it — a drag never produces a
  // literal midnight endpoint this way (see onCreateSlot's doc comment for
  // why that matters: the only way to represent "ends exactly at midnight"
  // is through the spanning-commitment split, not a raw same-day value).
  return Math.min(
    MINUTES_PER_DAY - DRAG_SNAP_MINUTES,
    Math.round(raw / DRAG_SNAP_MINUTES) * DRAG_SNAP_MINUTES,
  );
}

// Which day column (by index, matching dayOfWeek 0-6 left to right) a
// clientX currently sits over — null if it's outside all of them (over the
// hour-label gutter, or off either edge of the grid).
function dayIndexFromClientX(dayEls: (HTMLDivElement | null)[], clientX: number): number | null {
  for (let d = 0; d < dayEls.length; d++) {
    const el = dayEls[d];
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (clientX >= rect.left && clientX < rect.right) return d;
  }
  return null;
}

interface DragState {
  startDay: number;
  startMinute: number;
  // Where the pointer currently is — same day as startDay for an ordinary
  // same-day drag, or the adjacent column to either side for an overnight
  // one (see onCreateSlot's doc comment).
  currentDay: number;
  currentMinute: number;
}

interface PreviewSegment {
  dayOfWeek: number;
  start: number;
  end: number;
  // Whether this segment touches the midnight edge it's cut off at — used
  // to square that corner off, same as a real overnight pair's rendering.
  touchesTop: boolean;
  touchesBottom: boolean;
}

// One segment for an ordinary same-day drag, two for one that's crossed
// into an adjacent day — mirrors exactly how a saved overnight pair
// renders (two ordinary segments meeting at midnight, no merge logic
// needed), so the live preview and the real thing look like the same
// system.
function previewSegments(drag: DragState): PreviewSegment[] {
  if (drag.currentDay === drag.startDay) {
    return [
      {
        dayOfWeek: drag.startDay,
        start: Math.min(drag.startMinute, drag.currentMinute),
        end: Math.max(drag.startMinute, drag.currentMinute),
        touchesTop: false,
        touchesBottom: false,
      },
    ];
  }
  if (drag.currentDay > drag.startDay) {
    return [
      {
        dayOfWeek: drag.startDay,
        start: drag.startMinute,
        end: MINUTES_PER_DAY,
        touchesTop: false,
        touchesBottom: true,
      },
      {
        dayOfWeek: drag.currentDay,
        start: 0,
        end: drag.currentMinute,
        touchesTop: true,
        touchesBottom: false,
      },
    ];
  }
  return [
    {
      dayOfWeek: drag.currentDay,
      start: drag.currentMinute,
      end: MINUTES_PER_DAY,
      touchesTop: false,
      touchesBottom: true,
    },
    {
      dayOfWeek: drag.startDay,
      start: 0,
      end: drag.startMinute,
      touchesTop: true,
      touchesBottom: false,
    },
  ];
}

interface WeekCalendarProps {
  blocks: ScheduleBlock[];
  // The commitment's full block set — 1 for an ordinary block, 2 for an
  // overnight pair (resolved via pairId before calling this).
  onEdit: (blocks: ScheduleBlock[]) => void;
  // Fired on click or click-drag over empty grid space. Always describes a
  // same-day-terms range: an ordinary drag never leaves its starting day,
  // and an overnight one is expressed the same way the manual form and
  // click-defaulting-past-midnight already are — endTime wrapped below
  // startTime — so the caller can feed this straight into the same create
  // flow without any special-casing. dayOfWeek is always the *earlier* of
  // the two days touched: dragging right (today's evening into tomorrow's
  // early morning) keeps it as the day the drag started on; dragging left
  // (this morning's early hours back into last night) reports the
  // *previous* day instead, since that's the commitment's real start.
  onCreateSlot: (dayOfWeek: number, startTime: number, endTime: number) => void;
}

function findPartner(
  block: ScheduleBlock,
  all: ScheduleBlock[],
): ScheduleBlock | undefined {
  if (!block.pairId) return undefined;
  return all.find((b) => b.pairId === block.pairId && b.id !== block.id);
}

export function WeekCalendar({ blocks, onEdit, onCreateSlot }: WeekCalendarProps) {
  const today = new Date().getDay();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

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

  function handleMouseDown(dayOfWeek: number, e: React.MouseEvent<HTMLDivElement>) {
    // Only starts a create-drag on genuinely empty grid space — an
    // existing block's own button sits on top and handles its own click;
    // without this check, a mousedown on it would bubble up and start a
    // create-drag underneath the block being clicked to edit.
    if (e.target !== e.currentTarget) return;
    const el = dayRefs.current[dayOfWeek];
    if (!el) return;
    const minute = minuteFromClientY(el, e.clientY);
    const next: DragState = {
      startDay: dayOfWeek,
      startMinute: minute,
      currentDay: dayOfWeek,
      currentMinute: minute,
    };
    dragRef.current = next;
    setDrag(next);
  }

  // A single mount-long subscription, not one per drag — window-level
  // because the pointer can move outside the day column (or the grid
  // entirely) mid-drag without the gesture ending. Gates everything on
  // dragRef (a ref) rather than the `drag` state value itself, so this
  // effect never needs to re-subscribe as the drag progresses.
  useEffect(() => {
    // Only the column immediately to either side of where the drag
    // started is reachable — the data model can only ever represent a
    // commitment as two blocks (this day's evening half + one adjacent
    // day's early-morning half), not three or more, so there's nowhere
    // useful for a third day to go.
    function resolveDay(startDay: number, clientX: number): number {
      const raw = dayIndexFromClientX(dayRefs.current, clientX);
      if (raw === null) return dragRef.current?.currentDay ?? startDay;
      return Math.max(startDay - 1, Math.min(startDay + 1, raw));
    }
    function handleMove(e: MouseEvent) {
      const current = dragRef.current;
      if (!current) return;
      const currentDay = resolveDay(current.startDay, e.clientX);
      const el = dayRefs.current[currentDay];
      if (!el) return;
      const currentMinute = minuteFromClientY(el, e.clientY);
      const next = { ...current, currentDay, currentMinute };
      dragRef.current = next;
      setDrag(next);
    }
    function handleUp(e: MouseEvent) {
      const current = dragRef.current;
      if (!current) return;
      const currentDay = resolveDay(current.startDay, e.clientX);
      const el = dayRefs.current[currentDay];
      const currentMinute = el ? minuteFromClientY(el, e.clientY) : current.currentMinute;
      dragRef.current = null;
      setDrag(null);

      if (currentDay === current.startDay) {
        const start = Math.min(current.startMinute, currentMinute);
        const span = Math.max(current.startMinute, currentMinute) - start;
        // A plain click (no real drag) defaults to a 1h block. Wrapping via
        // modulo covers clicking late enough that the default hour would
        // run past midnight — see onCreateSlot's doc comment.
        const end = span < MIN_DRAG_MINUTES ? (start + 60) % MINUTES_PER_DAY : start + span;
        onCreateSlot(current.startDay, start, end);
      } else if (currentDay > current.startDay) {
        // Dragged right, into tomorrow: today's startMinute onward, ending
        // at tomorrow's currentMinute — exactly the wrapped shape
        // onCreateSlot's callers already expect.
        onCreateSlot(current.startDay, current.startMinute, currentMinute);
      } else {
        // Dragged left, into yesterday: the *real* start is yesterday's
        // currentMinute, ending at today's original startMinute — the drag
        // started on the tail side of the commitment, not the head.
        onCreateSlot(currentDay, currentMinute, current.startMinute);
      }
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [onCreateSlot]);

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
            const previews = drag
              ? previewSegments(drag).filter((s) => s.dayOfWeek === dayOfWeek)
              : [];

            return (
              <div
                key={dayOfWeek}
                ref={(el) => {
                  dayRefs.current[dayOfWeek] = el;
                }}
                onMouseDown={(e) => handleMouseDown(dayOfWeek, e)}
                className={cn(
                  "relative flex-1 cursor-pointer border-l border-border first:border-l-0 select-none",
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

                {/* Live drag preview — a dashed, unfilled-in-color outline
                    (deliberately distinct from a real block's solid
                    bg-muted fill) with its own time range printed above it,
                    so "where this new commitment will land" is exactly as
                    legible while dragging as an existing block is at rest.
                    Two segments (one per column) once the drag crosses into
                    an adjacent day — see previewSegments — with whichever
                    corner touches midnight squared off, same as a real
                    overnight pair's rendering below. */}
                {previews.map((seg, i) => (
                  <div
                    key={i}
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-x-0.5 z-20 rounded-md border-2 border-dashed border-accent-cyan bg-accent-cyan/10",
                      seg.touchesTop && "rounded-t-none",
                      seg.touchesBottom && "rounded-b-none",
                    )}
                    style={{
                      top: (seg.start / MINUTES_PER_DAY) * GRID_HEIGHT,
                      height: Math.max(
                        ((seg.end - seg.start) / MINUTES_PER_DAY) * GRID_HEIGHT,
                        4,
                      ),
                    }}
                  >
                    {/* A segment starting at minute 0 (the tail half of a
                        drag that's crossed into tomorrow) has no room
                        above it to float a label without spilling into the
                        sticky header — puts it just inside the box instead
                        of hovering above, unlike every other segment. */}
                    <span
                      className={cn(
                        "absolute left-0 whitespace-nowrap font-mono text-[10px] text-accent-cyan",
                        seg.touchesTop ? "top-0.5 left-1" : "-top-4",
                      )}
                    >
                      {formatClockTime(seg.start)} – {formatClockTime(seg.end)}
                    </span>
                  </div>
                ))}

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
                      // Blocks handle their own mousedown so a drag started
                      // on top of one edits instead of also starting a
                      // create-drag on the empty space underneath it.
                      onMouseDown={(e) => e.stopPropagation()}
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
