"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/query-error-state";
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
import { WeekCalendar } from "@/features/schedule/components/week-calendar";
import {
  ScheduleFormSheet,
  type ScheduleSlot,
} from "@/features/schedule/components/schedule-form-sheet";
import { useDeleteScheduleBlocks, useScheduleBlocks } from "@/features/schedule/hooks";
import { formatDuration } from "@/lib/time";
import type { ScheduleBlock } from "@/types";

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  );
}

export default function SchedulePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: blocks, isLoading, isError, refetch } = useScheduleBlocks();
  const deleteBlocks = useDeleteScheduleBlocks();
  // Lazy initializer, not an effect — see app/(app)/tasks/page.tsx's
  // identical pattern for why (react-hooks/set-state-in-effect).
  const [sheetOpen, setSheetOpen] = useState(() => Boolean(searchParams.get("new")));
  // Whichever commitment is being edited, as its full block set — 1 for an
  // ordinary block, 2 for an overnight pair. WeekCalendar has already
  // resolved the pair (if any) before calling onEdit.
  const [editingBlocks, setEditingBlocks] = useState<ScheduleBlock[]>([]);
  // The calendar grid opens the edit sheet directly on click (no per-block
  // menu), so delete lives inside that sheet — this is the confirmation it
  // triggers, same shared-AlertDialog-at-the-page-level pattern as every
  // other delete flow in the app.
  const [deleteTarget, setDeleteTarget] = useState<ScheduleBlock[] | null>(null);
  // Set by clicking/dragging empty grid space — prefills create mode with
  // that day/time range. Cleared whenever create is opened any other way,
  // so the "New commitment" button and the "n" shortcut still default to
  // right-now instead of stale grid coordinates from a previous click.
  const [createSlot, setCreateSlot] = useState<ScheduleSlot | null>(null);

  useEffect(() => {
    if (searchParams.get("new")) {
      router.replace("/schedule");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingBlocks([]);
    setCreateSlot(null);
    setSheetOpen(true);
  }

  function openEdit(blocks: ScheduleBlock[]) {
    setEditingBlocks(blocks);
    setSheetOpen(true);
  }

  // Click or click-drag on empty grid space — see WeekCalendar's
  // onCreateSlot doc comment for why startTime/endTime already arrive
  // correctly wrapped for a commitment that runs past midnight.
  function handleCreateSlot(dayOfWeek: number, startTime: number, endTime: number) {
    setEditingBlocks([]);
    setCreateSlot({ dayOfWeek, startTime, endTime });
    setSheetOpen(true);
  }

  // "n" opens the create sheet — same page-level shortcut as Tasks/Projects,
  // for parity ("master control" is a standing app-wide principle).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        openCreate();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Real numbers, not decoration — total committed time across the whole
  // week, same "describe what's actually there" principle as Tasks' stats
  // line.
  const totalMinutes = useMemo(
    () => (blocks ?? []).reduce((sum, b) => sum + (b.endTime - b.startTime), 0),
    [blocks],
  );
  // Distinct commitments, not raw block rows — an overnight pair is 2 rows
  // in the database but one thing to the person counting their week, same
  // as everywhere else pairId collapses a pair back into "one commitment."
  const commitmentCount = useMemo(
    () => new Set((blocks ?? []).map((b) => b.pairId ?? b.id)).size,
    [blocks],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Schedule</h1>
        <Button onClick={openCreate}>
          <Plus />
          New commitment
          <kbd className="ml-1 font-mono text-xs opacity-70">n</kbd>
        </Button>
      </div>

      {!isLoading && !isError && (
        <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <span>
            {commitmentCount} commitment{commitmentCount === 1 ? "" : "s"}
          </span>
          <span>{formatDuration(totalMinutes)} committed this week</span>
          <span className="text-muted-foreground/70">
            Click or drag on the grid to add a commitment
          </span>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-150 w-full" />
      ) : isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : (
        <WeekCalendar blocks={blocks ?? []} onEdit={openEdit} onCreateSlot={handleCreateSlot} />
      )}

      <ScheduleFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        blocks={editingBlocks}
        initialSlot={createSlot}
        onDelete={
          editingBlocks.length > 0
            ? () => {
                setSheetOpen(false);
                setDeleteTarget(editingBlocks);
              }
            : undefined
        }
      />

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
    </div>
  );
}
