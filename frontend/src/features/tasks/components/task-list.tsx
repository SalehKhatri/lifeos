"use client";

import { useRef, useState } from "react";
import { FolderKanban, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getDeadlineUrgency } from "@/lib/datetime";
import { useCompleteTask, useDeleteTask, useReopenTask } from "@/features/tasks/hooks";
import type { Task, TaskPriority } from "@/types";

// Priority reads as a system-level HUD signal (a colored edge + a small
// tracked-uppercase label), not a filled Badge like category/project — see
// frontend/DESIGN.md's accent-token convention: cyan/amber/magenta glow is
// reserved for things that should actually stand out, so only HIGH/URGENT
// get a glowing edge. LOW/MEDIUM stay understated on purpose.
const PRIORITY_EDGE: Record<TaskPriority, string> = {
  LOW: "bg-border",
  MEDIUM: "bg-accent-cyan",
  HIGH: "bg-accent-amber shadow-glow-amber",
  URGENT: "bg-accent-magenta shadow-glow-magenta",
};

const PRIORITY_TEXT: Record<TaskPriority, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-accent-cyan",
  HIGH: "text-accent-amber",
  URGENT: "text-accent-magenta",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

export function TaskList({ tasks, onEdit }: TaskListProps) {
  const completeTask = useCompleteTask();
  const reopenTask = useReopenTask();
  const deleteTask = useDeleteTask();
  // A single shared AlertDialog, not one per row, controlled by which task
  // (if any) is pending deletion — deliberately NOT an AlertDialogTrigger
  // nested inside a DropdownMenuItem: that pattern fights the menu's own
  // close-on-select behavior and Base UI's portal/focus handling (this
  // project has already hit a few Base UI vs. Radix surprises this session).
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        No tasks match these filters.
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-2"
      >
        {tasks.map((task) => (
          <motion.div key={task.id} variants={fadeInUp}>
            <TaskCard
              task={task}
              onEdit={() => onEdit(task)}
              onDelete={() => setDeleteTarget(task)}
              onComplete={() => completeTask.mutate(task)}
              onUncomplete={() => reopenTask.mutate(task)}
            />
          </motion.div>
        ))}
      </motion.div>

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
    </>
  );
}

interface TaskCardProps {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onUncomplete: () => void;
}

function TaskCard({ task, onEdit, onDelete, onComplete, onUncomplete }: TaskCardProps) {
  const done = task.status === "DONE";
  const urgency = getDeadlineUrgency(task.deadline, done);
  const cardRef = useRef<HTMLDivElement>(null);

  // Cursor-tracked highlight, not a static hover state — see
  // frontend/DESIGN.md's "reactive, not static" microinteraction principle
  // (the auth pages' cursor-as-torch orbs are the reference example). Writes
  // the pointer position straight to CSS custom properties on the DOM node
  // instead of React state — pointermove fires constantly, and a re-render
  // per pixel of mouse movement would be wasteful on a list that can hold
  // many of these at once.
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    cardRef.current?.style.setProperty("--glow-x", `${e.clientX - rect.left}px`);
    cardRef.current?.style.setProperty("--glow-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      className="group/task relative flex items-center gap-3 overflow-hidden rounded-lg bg-card py-3 pr-3 pl-4 text-sm text-card-foreground ring-1 ring-foreground/10 transition-transform duration-150 hover:-translate-y-0.5"
    >
      {/* Priority edge — a HUD status stripe, not just a badge in the text. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-0.75",
          done ? "bg-border" : PRIORITY_EDGE[task.priority],
        )}
      />

      {/* Targeting-frame corner ticks — idle at low opacity, brighten on hover.
          Inset 1.5 (6px) on both, matching --radius-lg exactly, so they sit
          just past the card's own rounded-corner curve instead of getting
          clipped by overflow-hidden — same inset on both corners so they
          read as a matched pair, not the priority edge stripe (3px wide)
          nudging just the top-left one off-center from the other. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1.5 left-1.5 h-3 w-3 border-t-2 border-l-2 border-accent-cyan/15 transition-colors duration-150 group-hover/task:border-accent-cyan/60"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-1.5 bottom-1.5 h-3 w-3 border-r-2 border-b-2 border-accent-cyan/15 transition-colors duration-150 group-hover/task:border-accent-cyan/60"
      />

      {/* Cursor-follow highlight — references the accent-cyan token via
          color-mix rather than a hardcoded color, per DESIGN.md's rule. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover/task:opacity-100"
        style={{
          background:
            "radial-gradient(220px circle at var(--glow-x, 50%) var(--glow-y, 50%), color-mix(in oklch, var(--accent-cyan) 8%, transparent), transparent 70%)",
        }}
      />

      {/* A real toggle, not a one-way "complete" button — unchecking a done
          task reverts it to TODO. A disabled, faded-out checkbox after
          completion left no way to recover from an accidental click short of
          opening the edit form; a checkbox that just works both ways is the
          simpler fix. Kept at full opacity regardless of done state (see
          the content wrapper below) since it's the primary control here —
          fading it out alongside the text made it hard to even see it was
          checked. */}
      <Checkbox
        checked={done}
        onCheckedChange={(checked) => (checked ? onComplete() : onUncomplete())}
        aria-label={done ? "Mark as not done" : "Mark complete"}
        className="relative z-10"
      />

      <div className={cn("relative z-10 min-w-0 flex-1 space-y-1.5", done && "opacity-70")}>
        <div className="flex items-center gap-2">
          {task.status === "IN_PROGRESS" && (
            <span
              aria-hidden
              className="size-1.5 shrink-0 animate-pulse rounded-full bg-accent-cyan"
              title="In progress"
            />
          )}
          <p className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>
            {task.title}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {/* Priority: a small readout, not a filled pill — reserves the
              filled/glowing treatment for the edge stripe above. */}
          <span
            className={cn(
              "font-heading font-semibold tracking-wider uppercase",
              done ? "text-muted-foreground" : PRIORITY_TEXT[task.priority],
            )}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>

          {task.project && (
            <span className="flex items-center gap-1 rounded-sm border border-accent-cyan/25 bg-accent-cyan/10 px-1.5 py-0.5 text-accent-cyan">
              <FolderKanban className="size-3" />
              {task.project.name}
            </span>
          )}

          {task.category && (
            <span
              className="flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5"
              style={{
                borderColor: `${task.category.color ?? "var(--border)"}40`,
                backgroundColor: `${task.category.color ?? "transparent"}1a`,
                color: task.category.color ?? undefined,
              }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ backgroundColor: task.category.color ?? undefined }}
              />
              {task.category.name}
            </span>
          )}

          {task.deadline && (
            <span
              className={cn(
                "font-mono",
                urgency === "overdue" && "font-semibold text-destructive",
                urgency === "due-today" && "font-semibold text-accent-amber",
              )}
            >
              {new Date(task.deadline).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {urgency === "overdue" && " · overdue"}
            </span>
          )}
          <span className="font-mono">{task.estimatedDuration}m</span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label="Task actions" />}
          className="relative z-10"
        >
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
