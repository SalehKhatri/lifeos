"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { PartyPopper, Plus, Sun, Sunset, Moon } from "lucide-react";
import { fadeInUp } from "@/lib/motion";
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
import { TopTaskCard } from "@/features/recommendations/components/top-task-card";
import { TodaysCommitments } from "@/features/recommendations/components/todays-commitments";
import { CommitmentStatusBanner } from "@/features/recommendations/components/commitment-status-banner";
import { useNowMinutes, useRecommendations, useTodayView } from "@/features/recommendations/hooks";
import { useCurrentUser } from "@/features/auth/hooks";
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

// Hour boundaries are a matter of taste, not a spec — picked the usual
// noon/5pm split rather than anything configurable.
function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Real information, not decoration — the icon changes with the same
// boundaries as the greeting text itself rather than being a fixed
// ornament, so it's reinforcing what the words already say, not filler.
function GreetingIcon({ hour }: { hour: number }) {
  if (hour < 12) return <Sun className="size-5 text-accent-cyan" />;
  if (hour < 17) return <Sunset className="size-5 text-accent-cyan" />;
  return <Moon className="size-5 text-accent-cyan" />;
}

export default function TodayPage() {
  const { data: today, isLoading, isError, refetch } = useTodayView();
  const { data: recommendations } = useRecommendations();
  const { data: user } = useCurrentUser();
  const completeTask = useCompleteTask();
  const setStatus = useSetTaskStatus();
  const deleteTask = useDeleteTask();
  // One shared clock for the whole page — CommitmentStatusBanner and
  // TodaysCommitments both read this instead of ticking their own,
  // independent 30s intervals (see hooks.ts's useNowMinutes).
  const nowMinutes = useNowMinutes();
  const now = new Date();

  // The full ranked list (`recommendations.tasks`) is longer than what the
  // Today view actually surfaces (topTask + up to 3 more) — this is
  // whatever's left over, so "Up Next" doesn't quietly hide the rest of
  // the queue with no way to see it.
  const queuedCount = useMemo(() => {
    if (!recommendations || !today) return 0;
    const shown = (today.topTask ? 1 : 0) + today.upNext.length;
    return Math.max(0, recommendations.tasks.length - shown);
  }, [recommendations, today]);

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
        <div>
          <h1 className="font-heading text-2xl font-semibold">Today</h1>
          {/* Static "Today" stays the actual heading (matches every other
              page's plain-name h1) — the greeting/date is a subtitle, not
              a replacement for it. Given real presence of its own though
              (user feedback: "much better... a bit bigger... something
              interesting") — a one-time entrance (fadeInUp, not a repeating
              loop — this only needs to happen once per page load), a
              time-of-day icon that's real information rather than a fixed
              ornament, and a moving shimmer on the name itself
              (.animate-shimmer, globals.css) as this page's one deliberate
              "feels alive" moment, same restraint as .animate-pulse-glow's
              reserved-for-the-hero-card treatment elsewhere on this page. */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="mt-1 flex items-center gap-1.5"
          >
            <GreetingIcon hour={now.getHours()} />
            <p className="font-heading text-lg text-muted-foreground">
              {greetingFor(now.getHours())}
              {user?.name && (
                <>
                  {", "}
                  <span className="animate-shimmer font-semibold">{user.name}</span>
                </>
              )}
            </p>
          </motion.div>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground/70">
            {now.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          New task
          <kbd className="ml-1 font-mono text-xs opacity-70">n</kbd>
        </Button>
      </div>

      {/* Whatever's on right now, before anything else — "what should I
          work on" implicitly depends on what's already claiming your time
          this exact minute, so it leads the page rather than sitting
          buried in the commitments list further down. */}
      {!isLoading && !isError && today && (
        <CommitmentStatusBanner commitments={today.commitments} nowMinutes={nowMinutes} />
      )}

      {/* Real, at-a-glance number — the whole premise of this page is
          "given your actual free time, here's what to work on," so that
          number deserves to be visible, not just used internally by the
          engine. */}
      {recommendations && (
        <p className="font-mono text-xs text-muted-foreground">
          {formatDuration(recommendations.availableMinutesToday)} free today
        </p>
      )}

      {isError ? (
        // One error state for all three sections below, not three separate
        // ones — topTask/upNext/commitments all come from this same query,
        // so they fail together, not independently.
        <QueryErrorState onRetry={() => refetch()} />
      ) : (
        <>
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
              {/* The ranked list is longer than what this page surfaces —
                  a quiet link, not a hidden truncation, to the rest of the
                  queue. */}
              {queuedCount > 0 && (
                <Link
                  href="/tasks"
                  className="block px-1 text-xs text-muted-foreground underline-offset-2 hover:text-accent-cyan hover:underline"
                >
                  +{queuedCount} more task{queuedCount === 1 ? "" : "s"} in your queue →
                </Link>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h2 className="font-heading text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Today&apos;s Commitments
            </h2>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <TodaysCommitments commitments={today?.commitments ?? []} nowMinutes={nowMinutes} />
            )}
          </div>
        </>
      )}

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
              variant="destructive"
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
