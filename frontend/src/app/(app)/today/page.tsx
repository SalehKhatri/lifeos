"use client";

import { useEffect, useState } from "react";
import { PartyPopper, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { TopTaskCard } from "@/features/recommendations/components/top-task-card";
import { TodaysCommitments } from "@/features/recommendations/components/todays-commitments";
import { useRecommendations, useTodayView } from "@/features/recommendations/hooks";
import { TaskCard } from "@/features/tasks/components/task-list";
import { TaskFormSheet } from "@/features/tasks/components/task-form-sheet";
import { useCompleteTask, useDeleteTask, useSetTaskStatus } from "@/features/tasks/hooks";
import { formatDuration } from "@/lib/time";
import type { Task } from "@/types";

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  );
}

export default function TodayPage() {
  const { data: today, isLoading } = useTodayView();
  const { data: recommendations } = useRecommendations();
  const completeTask = useCompleteTask();
  const setStatus = useSetTaskStatus();
  const deleteTask = useDeleteTask();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  function openCreate() {
    setEditingTask(null);
    setSheetOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setSheetOpen(true);
  }

  // "n" for a new task (parity with Tasks/Projects/Schedule), "d" to mark
  // the top recommended task done — this page's whole reason to exist is
  // "here's the one thing to do right now," so finishing it deserves its
  // own direct shortcut, not just the button.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        openCreate();
      } else if (e.key.toLowerCase() === "d" && today?.topTask) {
        e.preventDefault();
        completeTask.mutate(today.topTask);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today?.topTask]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Today</h1>
        <Button onClick={openCreate}>
          <Plus />
          New task
          <kbd className="ml-1 font-mono text-xs opacity-70">n</kbd>
        </Button>
      </div>

      {/* Real, at-a-glance number — the whole premise of this page is
          "given your actual free time, here's what to work on," so that
          number deserves to be visible, not just used internally by the
          engine. */}
      {recommendations && (
        <p className="font-mono text-xs text-muted-foreground">
          {formatDuration(recommendations.availableMinutesToday)} free today
        </p>
      )}

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : today?.topTask ? (
        <TopTaskCard
          task={today.topTask}
          onEdit={() => openEdit(today.topTask!)}
          onMarkDone={() => completeTask.mutate(today.topTask!)}
          isMarkingDone={completeTask.isPending}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <PartyPopper className="size-6 text-accent-cyan" />
          <p className="text-sm text-muted-foreground">
            Nothing needs attention right now — you&apos;re all caught up.
          </p>
        </div>
      )}

      {!isLoading && today && today.upNext.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Up Next
          </h2>
          <div className="space-y-2">
            {today.upNext.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={() => openEdit(task)}
                onDelete={() => setDeleteTarget(task)}
                onStatusChange={(status) => setStatus.mutate({ task, status })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-heading text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Today&apos;s Commitments
        </h2>
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <TodaysCommitments commitments={today?.commitments ?? []} />
        )}
      </div>

      <TaskFormSheet open={sheetOpen} onOpenChange={setSheetOpen} task={editingTask} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted. This can&apos;t be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) deleteTask.mutate(deleteTarget);
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
