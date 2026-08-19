"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useCompleteTask, useDeleteTask } from "@/features/tasks/hooks";
import type { Task, TaskPriority } from "@/types";

const PRIORITY_VARIANT: Record<TaskPriority, "secondary" | "cyan" | "amber" | "magenta"> = {
  LOW: "secondary",
  MEDIUM: "cyan",
  HIGH: "amber",
  URGENT: "magenta",
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
        {tasks.map((task) => {
          const done = task.status === "DONE";
          return (
            <motion.div key={task.id} variants={fadeInUp}>
              <Card>
                <CardContent className="flex items-center gap-3 py-3">
                  <Checkbox
                    checked={done}
                    onCheckedChange={() => {
                      if (!done) completeTask.mutate(task.id);
                    }}
                    aria-label={done ? "Completed" : "Mark complete"}
                    disabled={done}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className={cn(
                        "truncate font-medium",
                        done && "text-muted-foreground line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={PRIORITY_VARIANT[task.priority]}>
                        {PRIORITY_LABEL[task.priority]}
                      </Badge>
                      {task.category && (
                        <Badge variant="outline" className="gap-1">
                          <span
                            className="size-1.5 rounded-full"
                            style={{ backgroundColor: task.category.color ?? undefined }}
                          />
                          {task.category.name}
                        </Badge>
                      )}
                      {task.deadline && (
                        <span className="font-mono">
                          {new Date(task.deadline).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      <span className="font-mono">{task.estimatedDuration}m</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label="Task actions" />
                      }
                    >
                      <MoreVertical />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onEdit(task)}>
                          <Pencil className="mr-2 size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(task)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
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
                if (deleteTarget) deleteTask.mutate(deleteTarget.id);
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
