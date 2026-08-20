"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScheduleList } from "@/features/schedule/components/schedule-list";
import { ScheduleFormSheet } from "@/features/schedule/components/schedule-form-sheet";
import { useScheduleBlocks } from "@/features/schedule/hooks";
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
  const { data: blocks, isLoading } = useScheduleBlocks();
  // Lazy initializer, not an effect — see app/(app)/tasks/page.tsx's
  // identical pattern for why (react-hooks/set-state-in-effect).
  const [sheetOpen, setSheetOpen] = useState(() => Boolean(searchParams.get("new")));
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);

  useEffect(() => {
    if (searchParams.get("new")) {
      router.replace("/schedule");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingBlock(null);
    setSheetOpen(true);
  }

  function openEdit(block: ScheduleBlock) {
    setEditingBlock(block);
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

      {!isLoading && (
        <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <span>
            {(blocks ?? []).length} commitment{(blocks ?? []).length === 1 ? "" : "s"}
          </span>
          <span>{formatDuration(totalMinutes)} committed this week</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <ScheduleList blocks={blocks ?? []} onEdit={openEdit} />
      )}

      <ScheduleFormSheet open={sheetOpen} onOpenChange={setSheetOpen} block={editingBlock} />
    </div>
  );
}
