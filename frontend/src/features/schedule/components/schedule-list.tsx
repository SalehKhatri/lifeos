"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
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
import { DAY_LABELS, formatClockTime, formatDuration } from "@/lib/time";
import { useDeleteScheduleBlock } from "@/features/schedule/hooks";
import type { ScheduleBlock } from "@/types";

interface ScheduleListProps {
  blocks: ScheduleBlock[];
  onEdit: (block: ScheduleBlock) => void;
}

// Grouped by day, all 7 days always shown (even empty ones) — "shows the
// whole week at a glance" was the point of this layout per the original
// plan, and an empty day is itself real information (this day is fully
// free), not a state worth hiding.
export function ScheduleList({ blocks, onEdit }: ScheduleListProps) {
  const deleteBlock = useDeleteScheduleBlock();
  // A single shared AlertDialog, not one per block — same reasoning as the
  // Tasks/Projects delete confirmations.
  const [deleteTarget, setDeleteTarget] = useState<ScheduleBlock | null>(null);
  const today = new Date().getDay();

  return (
    <>
      <div className="space-y-4">
        {DAY_LABELS.map((dayName, dayOfWeek) => {
          const dayBlocks = blocks
            .filter((b) => b.dayOfWeek === dayOfWeek)
            .sort((a, b) => a.startTime - b.startTime);
          const totalMinutes = dayBlocks.reduce((sum, b) => sum + (b.endTime - b.startTime), 0);
          const isToday = dayOfWeek === today;

          return (
            <div key={dayOfWeek} className="space-y-2">
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
                {totalMinutes > 0 && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatDuration(totalMinutes)} committed
                  </span>
                )}
              </div>

              {dayBlocks.length === 0 ? (
                <p className="pl-0.5 text-xs text-muted-foreground italic">Fully free</p>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={staggerContainer}
                  className="space-y-1.5"
                >
                  {dayBlocks.map((block) => (
                    <motion.div key={block.id} layout variants={fadeInUp}>
                      <div className="flex items-center gap-3 rounded-lg bg-card px-3 py-2 text-sm text-card-foreground ring-1 ring-foreground/10 transition-colors hover:ring-accent-cyan/30">
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {formatClockTime(block.startTime)} – {formatClockTime(block.endTime)}
                        </span>
                        <p className="min-w-0 flex-1 truncate font-medium">{block.label}</p>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon-sm" aria-label="Commitment actions" />
                            }
                          >
                            <MoreVertical />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => onEdit(block)}>
                                <Pencil className="mr-2 size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeleteTarget(block)}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
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
              &ldquo;{deleteTarget?.label}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteBlock.mutate(deleteTarget);
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
