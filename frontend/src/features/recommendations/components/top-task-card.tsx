"use client";

import { Check, FolderKanban, Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRIORITY_LABEL, PRIORITY_TEXT } from "@/features/tasks/components/task-list";
import { getDeadlineUrgency } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { RecommendedTask } from "@/types";

interface TopTaskCardProps {
  task: RecommendedTask;
  onEdit: () => void;
  onMarkDone: () => void;
  isMarkingDone: boolean;
}

// The one surface DESIGN.md earmarked for a continuous ambient effect back
// when `.animate-pulse-glow` was first introduced ("reach for this on the
// handful of elements that should feel alive at rest, e.g. the Today
// page's top-task card") — this is that moment. Mutation is owned by the
// page (Today), not this component — same "parent owns mutations, child
// gets callbacks" convention as every other card in the app — so the page
// can wire the same action to both this button and a keyboard shortcut.
export function TopTaskCard({ task, onEdit, onMarkDone, isMarkingDone }: TopTaskCardProps) {
  const urgency = getDeadlineUrgency(task.deadline, false);

  return (
    <div className="relative animate-pulse-glow overflow-hidden rounded-xl border border-accent-cyan/30 bg-card p-5">
      <p className="font-heading text-xs font-semibold tracking-widest text-accent-cyan uppercase">
        Top Recommended Task
      </p>

      <h2 className="mt-2 font-heading text-xl font-semibold">{task.title}</h2>

      {task.description && (
        <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
      )}

      {/* The engine's "why this" — the entire point of a prioritization
          engine is answering this question, so it earns the one deliberate
          use of magenta as an "insight" signal (see frontend/DESIGN.md's
          accent-magenta convention), not just another muted detail line. */}
      <p className="mt-3 flex items-center gap-1.5 text-sm text-accent-magenta">
        <Sparkles className="size-3.5 shrink-0" />
        {task.reason}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span
          className={cn(
            "font-heading font-semibold tracking-wider uppercase",
            PRIORITY_TEXT[task.priority],
          )}
        >
          {PRIORITY_LABEL[task.priority]}
        </span>

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

      <div className="mt-5 flex items-center gap-2">
        <Button onClick={onMarkDone} disabled={isMarkingDone}>
          <Check />
          {isMarkingDone ? "Marking done…" : "Mark done"}
          <kbd className="ml-1 font-mono text-xs opacity-70">d</kbd>
        </Button>
        <Button variant="outline" onClick={onEdit}>
          <Pencil />
          Edit
        </Button>
      </div>
    </div>
  );
}
