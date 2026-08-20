"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Archive, Check, MoreVertical, Pause, Pencil, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { useDeleteProject, useSetProjectStatus } from "@/features/projects/hooks";
import type { Project, ProjectStatus } from "@/types";

// Same conventions as the (already once-corrected) task card — see
// frontend/DESIGN.md: one explicit status control (a Select, not a
// checkbox/dot split), real information over decoration, glow/color
// reserved for what should actually stand out.
function ProjectStatusLabel({ status }: { status: ProjectStatus }) {
  switch (status) {
    case "COMPLETED":
      return (
        <span className="flex items-center gap-1.5">
          <Check className="size-3" />
          Completed
        </span>
      );
    case "ARCHIVED":
      return (
        <span className="flex items-center gap-1.5">
          <Archive className="size-3" />
          Archived
        </span>
      );
    case "ON_HOLD":
      return (
        <span className="flex items-center gap-1.5">
          <Pause className="size-3" />
          On hold
        </span>
      );
    case "ACTIVE":
      return (
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-accent-cyan" />
          Active
        </span>
      );
  }
}

const STATUS_ITEMS: Record<ProjectStatus, ReactNode> = {
  ACTIVE: <ProjectStatusLabel status="ACTIVE" />,
  ON_HOLD: <ProjectStatusLabel status="ON_HOLD" />,
  COMPLETED: <ProjectStatusLabel status="COMPLETED" />,
  ARCHIVED: <ProjectStatusLabel status="ARCHIVED" />,
};

interface ProjectListProps {
  projects: Project[];
  onEdit: (project: Project) => void;
}

export function ProjectList({ projects, onEdit }: ProjectListProps) {
  const setStatus = useSetProjectStatus();
  const deleteProject = useDeleteProject();
  // A single shared AlertDialog, not one per card — same reasoning as the
  // task list's delete confirmation.
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  return (
    <>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {/* mode="popLayout" + each card's own `layout` — same reasoning as
            the task list: a removed card's siblings reflow into the gap as
            it fades out, instead of the two motions happening in sequence.
            The empty state lives inside this AnimatePresence (keyed
            "empty", col-span-full so it still reads as one message across
            the grid rather than a single narrow cell) rather than an early
            return before it — an early return would unmount AnimatePresence
            in the same render the last project disappears, before it gets
            a chance to animate that departure. */}
        <AnimatePresence mode="popLayout">
          {projects.length === 0 ? (
            <motion.div
              key="empty"
              variants={fadeInUp}
              exit="exit"
              className="col-span-full rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground"
            >
              No projects match these filters.
            </motion.div>
          ) : (
            projects.map((project) => (
              <motion.div key={project.id} layout variants={fadeInUp} exit="exit">
                <ProjectCard
                  project={project}
                  onEdit={() => onEdit(project)}
                  onDelete={() => setDeleteTarget(project)}
                  onStatusChange={(status) => setStatus.mutate({ project, status })}
                />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </motion.div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.name}&rdquo; will be permanently deleted. Its tasks won&apos;t
              be deleted — they&apos;ll just no longer be linked to a project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) deleteProject.mutate(deleteTarget);
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

interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: ProjectStatus) => void;
}

function ProjectCard({ project, onEdit, onDelete, onStatusChange }: ProjectCardProps) {
  const terminal = project.status === "COMPLETED" || project.status === "ARCHIVED";
  const urgency = getDeadlineUrgency(project.deadline, terminal);

  return (
    <div
      className={cn(
        "flex h-full flex-col gap-3 rounded-lg bg-card p-4 text-sm text-card-foreground ring-1 ring-foreground/10 transition-[box-shadow,ring-color] duration-150 hover:shadow-glow-cyan hover:ring-accent-cyan/30",
        terminal && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate font-heading font-semibold">{project.name}</p>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Project actions" />}>
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

      <Select
        items={STATUS_ITEMS}
        value={project.status}
        onValueChange={(v) => onStatusChange(v as ProjectStatus)}
      >
        <SelectTrigger
          size="sm"
          aria-label="Change status"
          className={cn(
            "h-6.5 w-fit gap-1 border-accent-cyan/20 px-2 text-xs",
            project.status === "ACTIVE" && "border-accent-cyan/50 bg-accent-cyan/5 text-accent-cyan",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem value="ACTIVE">
            <ProjectStatusLabel status="ACTIVE" />
          </SelectItem>
          <SelectItem value="ON_HOLD">
            <ProjectStatusLabel status="ON_HOLD" />
          </SelectItem>
          <SelectItem value="COMPLETED">
            <ProjectStatusLabel status="COMPLETED" />
          </SelectItem>
          <SelectItem value="ARCHIVED">
            <ProjectStatusLabel status="ARCHIVED" />
          </SelectItem>
        </SelectContent>
      </Select>

      {project.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
      )}

      <div className="mt-auto space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-heading text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            Progress
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {/* Real <Link>, not a click handler on a <span> — worth being a
                proper anchor (right-click, open in new tab), per
                DESIGN.md's convention. The only way to see which tasks make
                up this project; there's no /projects/[id] detail page (see
                DESIGN.md — a lean bridge into the existing Tasks page
                instead of a second task-list UI). */}
            <Link
              href={`/tasks?projectId=${project.id}`}
              className="underline-offset-2 hover:text-accent-cyan hover:underline"
            >
              {project.completedTaskCount}/{project.taskCount} tasks
            </Link>{" "}
            · {project.progress}%
          </span>
        </div>
        <Progress value={project.progress} />
      </div>

      {project.deadline && (
        <p
          className={cn(
            "font-mono text-xs text-muted-foreground",
            !terminal && urgency === "overdue" && "font-semibold text-destructive",
            !terminal && urgency === "due-today" && "font-semibold text-accent-amber",
          )}
        >
          Due{" "}
          {new Date(project.deadline).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
          {!terminal && urgency === "overdue" && " · overdue"}
        </p>
      )}
    </div>
  );
}
