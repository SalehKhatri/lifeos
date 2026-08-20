"use client";

import { useState } from "react";
import { MoreVertical, Pencil, TriangleAlert, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeInUp } from "@/lib/motion";
import { DAY_LABELS, MINUTES_PER_DAY, formatClockTime, formatDuration } from "@/lib/time";
import { hashLabelToColor } from "@/lib/colors";
import { findOverlappingIds } from "@/features/schedule/overlap";
import { useDeleteScheduleBlocks } from "@/features/schedule/hooks";
import type { ScheduleBlock } from "@/types";

interface ScheduleListProps {
  blocks: ScheduleBlock[];
  // A whole commitment's block set: 1 for an ordinary block, 2 for an
  // overnight pair — see resolveCommitmentBlocks below.
  onEdit: (blocks: ScheduleBlock[]) => void;
}

function findPartner(block: ScheduleBlock, all: ScheduleBlock[]): ScheduleBlock | undefined {
  if (!block.pairId) return undefined;
  return all.find((b) => b.pairId === block.pairId && b.id !== block.id);
}

// Grouped by day, all 7 days always shown (even empty ones) — "shows the
// whole week at a glance" was the point of this layout per the original
// plan, and an empty day is itself real information (this day is fully
// free), not a state worth hiding.
export function ScheduleList({ blocks, onEdit }: ScheduleListProps) {
  const deleteBlocks = useDeleteScheduleBlocks();
  // A single shared AlertDialog, not one per row — same reasoning as the
  // Tasks/Projects delete confirmations. Holds the full commitment (1 or 2
  // blocks), not just whichever row was clicked.
  const [deleteTarget, setDeleteTarget] = useState<ScheduleBlock[] | null>(null);
  const today = new Date().getDay();

  return (
    <>
      <div className="space-y-6">
        {DAY_LABELS.map((dayName, dayOfWeek) => {
          const dayBlocks = blocks
            .filter((b) => b.dayOfWeek === dayOfWeek)
            .sort((a, b) => a.startTime - b.startTime);
          const totalMinutes = dayBlocks.reduce((sum, b) => sum + (b.endTime - b.startTime), 0);
          const isToday = dayOfWeek === today;
          // Client-side only — the backend deliberately allows overlapping
          // blocks (see features/schedule/overlap.ts) — this is a warning,
          // not a validation rule. Runs against the raw per-day blocks
          // (unmerged) — a pair's two halves are always on different days
          // by construction, so this never needs to know about pairing.
          const overlapping = findOverlappingIds(dayBlocks);

          // A pair's "tail" half (starts at minute 0) is represented by its
          // "head" half's row on the *previous* day — skip it here, unless
          // its head is missing (an orphaned tail, which shouldn't happen
          // but shouldn't become invisible either if it somehow does).
          const rows = dayBlocks.filter((block) => {
            if (!block.pairId || block.startTime !== 0) return true;
            return findPartner(block, blocks) === undefined;
          });

          return (
            // A subtle filled panel per day, not just a border line — the
            // (app) layout's .hud-grid-bg texture behind this page meant a
            // thin border blended right into the grid instead of reading
            // as a divider (user feedback). An actual background fill
            // blocks the grid and reads as a real section boundary. Kept
            // deliberately subtle (bg-muted/20, not bg-card) so it doesn't
            // read as a card containing cards — the block rows below are
            // still the more prominent bg-card surface, this is just the
            // group they sit in.
            <div key={dayOfWeek} className="space-y-2 rounded-lg bg-muted/20 p-3">
              <div className="flex items-center gap-2">
                <h2
                  className={cn(
                    "font-heading text-xs font-semibold tracking-widest uppercase",
                    isToday ? "text-accent-cyan" : "text-muted-foreground",
                  )}
                >
                  {dayName}
                </h2>
                {isToday && (
                  <span className="rounded-sm border border-accent-cyan/30 bg-accent-cyan/10 px-1.5 py-0.5 font-mono text-[10px] text-accent-cyan">
                    Today
                  </span>
                )}
                {overlapping.size > 0 && (
                  <span
                    title="Two or more commitments overlap in time"
                    className="flex items-center gap-1 rounded-sm border border-accent-amber/30 bg-accent-amber/10 px-1.5 py-0.5 font-mono text-[10px] text-accent-amber"
                  >
                    <TriangleAlert className="size-2.5" />
                    Overlap
                  </span>
                )}
                {totalMinutes > 0 && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDuration(totalMinutes)} committed
                  </span>
                )}
              </div>

              {dayBlocks.length === 0 ? (
                <p className="pl-0.5 text-xs text-muted-foreground italic">Fully free</p>
              ) : (
                <>
                  {/* The timeline uses the raw, unmerged per-day blocks —
                      today's actual occupied minutes include a pair's tail
                      half even though it doesn't get its own row below. */}
                  <DayTimeline blocks={dayBlocks} isToday={isToday} />
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                    className="space-y-1.5"
                  >
                    {rows.map((block) => {
                      const isHead = Boolean(block.pairId) && block.endTime === MINUTES_PER_DAY;
                      const partner = isHead ? findPartner(block, blocks) : undefined;
                      const commitmentBlocks = partner ? [block, partner] : [block];
                      const displayEnd = partner ? partner.endTime : block.endTime;
                      const rowOverlapping =
                        overlapping.has(block.id) || (partner && overlapping.has(partner.id));

                      return (
                        <motion.div key={block.id} layout variants={fadeInUp}>
                          <div
                            className={cn(
                              "flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm text-card-foreground ring-1 ring-foreground/10 transition-colors hover:ring-accent-cyan/30",
                              rowOverlapping && "ring-accent-amber/40",
                            )}
                          >
                            <span
                              aria-hidden
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: hashLabelToColor(block.label) }}
                            />
                            <span className="shrink-0 font-mono text-xs text-muted-foreground">
                              {formatClockTime(block.startTime)} – {formatClockTime(displayEnd)}
                            </span>
                            <p className="min-w-0 flex-1 truncate font-medium">{block.label}</p>
                            {partner && (
                              <span
                                title="Runs past midnight into the next day"
                                className="rounded-sm border border-accent-cyan/25 bg-accent-cyan/10 px-1.5 py-0.5 font-mono text-[10px] text-accent-cyan"
                              >
                                overnight
                              </span>
                            )}
                            {rowOverlapping && (
                              <TriangleAlert
                                className="size-3.5 shrink-0 text-accent-amber"
                                aria-label="Overlaps with another commitment"
                              />
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Commitment actions"
                                  />
                                }
                              >
                                <MoreVertical />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                  <DropdownMenuItem onClick={() => onEdit(commitmentBlocks)}>
                                    <Pencil className="mr-2 size-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() => setDeleteTarget(commitmentBlocks)}
                                  >
                                    <Trash2 className="mr-2 size-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this commitment?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.[0]?.label}&rdquo; will be permanently deleted.
              {deleteTarget && deleteTarget.length === 2 && " It runs past midnight — both halves will be removed together."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteBlocks.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// A compact 24h strip showing where this day's blocks fall — "see the
// day's shape instantly" instead of reading each time range as text.
// Segment colors match each block's row-list dot (same hashLabelToColor),
// so the timeline and the detailed rows below read as one system, not two
// separate colorings of the same data. A thin marker shows the current
// time on today's timeline — free real information (where are we right
// now relative to what's committed), not decoration.
function DayTimeline({ blocks, isToday }: { blocks: ScheduleBlock[]; isToday: boolean }) {
  const now = new Date();
  const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : null;

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      {blocks.map((block) => (
        <div
          key={block.id}
          aria-hidden
          className="absolute inset-y-0 rounded-full opacity-80"
          style={{
            left: `${(block.startTime / MINUTES_PER_DAY) * 100}%`,
            width: `${((block.endTime - block.startTime) / MINUTES_PER_DAY) * 100}%`,
            backgroundColor: hashLabelToColor(block.label),
          }}
        />
      ))}
      {nowMinutes !== null && (
        <div
          aria-hidden
          className="absolute inset-y-0 w-px bg-foreground"
          style={{ left: `${(nowMinutes / MINUTES_PER_DAY) * 100}%` }}
        />
      )}
    </div>
  );
}
