"use client";

import { useState, type ReactNode } from "react";
import { Check, FolderKanban, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useDeleteTask, useSetTaskStatus } from "@/features/tasks/hooks";
import type { Task, TaskPriority, TaskStatus } from "@/types";

// Redesigned 2026-08-19 after user feedback that the previous version (a
// checkbox + a separate near-invisible status dot + corner-tick/cursor-glow
// decoration) was visually busy, hard to scan, and unclear what was
// actually clickable. This version: one explicit status control (text +
// chevron — a Select is unmistakably a dropdown), a plain two-line layout
// (title/actions, then metadata), and no decoration that isn't carrying
// information — see frontend/DESIGN.md for the full before/after reasoning.

// Priority only earns a visible signal (a colored left border) when it's
// HIGH/URGENT — the "reserved, not default" accent-token rule taken further
// than before: LOW/MEDIUM tasks get no border treatment at all, so the
// signal actually means something instead of every row carrying some color.
const PRIORITY_BORDER: Partial<Record<TaskPriority, string>> = {
  HIGH: "border-l-accent-amber",
  URGENT: "border-l-accent-magenta",
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

function StatusLabel({ status }: { status: TaskStatus }) {
  if (status === "DONE") {
    return (
      <span className="flex items-center gap-1.5">
        <Check className="size-3" />
        Done
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "IN_PROGRESS" ? "animate-pulse bg-accent-cyan" : "bg-muted-foreground",
        )}
      />
      {status === "IN_PROGRESS" ? "In Progress" : "To Do"}
    </span>
  );
}

// See frontend/DESIGN.md's Select.Value gotcha — items must be provided so
// the trigger resolves a label immediately (a task's status is always
// pre-set, the dropdown is never opened first to "teach" it the label).
const STATUS_ITEMS: Record<TaskStatus, ReactNode> = {
  TODO: <StatusLabel status="TODO" />,
  IN_PROGRESS: <StatusLabel status="IN_PROGRESS" />,
  DONE: <StatusLabel status="DONE" />,
};

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

export function TaskList({ tasks, onEdit }: TaskListProps) {
  const setStatus = useSetTaskStatus();
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
              onStatusChange={(status) => setStatus.mutate({ task, status })}
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
  onStatusChange: (status: TaskStatus) => void;
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const done = task.status === "DONE";
  const urgency = getDeadlineUrgency(task.deadline, done);
  const priorityBorder = !done ? PRIORITY_BORDER[task.priority] : undefined;

  return (
    <div
      className={cn(
        "group/task flex items-start gap-2 rounded-lg border-l-2 border-l-transparent bg-card px-3 py-2.5 text-sm text-card-foreground ring-1 ring-foreground/10 transition-[box-shadow,ring-color] duration-150 hover:shadow-glow-cyan hover:ring-accent-cyan/30",
        priorityBorder,
        task.priority === "URGENT" && !done && "shadow-glow-magenta",
      )}
    >
      <div className={cn("min-w-0 flex-1 space-y-1.5", done && "opacity-70")}>
        <div className="flex items-center gap-2">
          {/* One control for the whole lifecycle (To Do / In Progress /
              Done) — a Select's own chevron makes "this is a dropdown"
              obvious, unlike the previous checkbox + separate near-
              invisible dot for two different controls doing one job. */}
          <Select
            items={STATUS_ITEMS}
            value={task.status}
            onValueChange={(v) => onStatusChange(v as TaskStatus)}
          >
            <SelectTrigger
              size="sm"
              aria-label="Change status"
              className={cn(
                // A faint cyan border at rest — reads as a system control,
                // not a generic bootstrap-y dropdown — intensifying to a
                // full cyan tint when actually in progress.
                "h-6.5 shrink-0 gap-1 border-accent-cyan/20 px-2 text-xs",
                task.status === "IN_PROGRESS" &&
                  "border-accent-cyan/50 bg-accent-cyan/5 text-accent-cyan",
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="TODO">
                <StatusLabel status="TODO" />
              </SelectItem>
              <SelectItem value="IN_PROGRESS">
                <StatusLabel status="IN_PROGRESS" />
              </SelectItem>
              <SelectItem value="DONE">
                <StatusLabel status="DONE" />
              </SelectItem>
            </SelectContent>
          </Select>

          <p className={cn("min-w-0 flex-1 truncate font-medium", done && "line-through")}>
            {task.title}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {/* font-heading + tracked uppercase — the app's "technical/HUD
              voice" tier (see DESIGN.md's type system), not a plain label.
              Dropped in an earlier pass while de-cluttering the card;
              restoring it doesn't add clutter (no new element, just a font
              choice) but does restore some of the identity that was lost
              along with the corner-tick/cursor-glow decoration. */}
          <span
            className={cn(
              "font-heading font-semibold tracking-wider uppercase",
              !done && PRIORITY_TEXT[task.priority],
            )}
          >
            {PRIORITY_LABEL[task.priority]}
          </span>

          {task.deadline && (
            <span
              className={cn(
                "font-mono",
                !done && urgency === "overdue" && "font-semibold text-destructive",
                !done && urgency === "due-today" && "font-semibold text-accent-amber",
              )}
            >
              {new Date(task.deadline).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {!done && urgency === "overdue" && " · overdue"}
            </span>
          )}

          <span className="font-mono">{task.estimatedDuration}m</span>

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

          {task.project && (
            <span className="flex items-center gap-1 rounded-sm border border-accent-cyan/25 bg-accent-cyan/10 px-1.5 py-0.5 text-accent-cyan">
              <FolderKanban className="size-3" />
              {task.project.name}
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Task actions" />}>
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
