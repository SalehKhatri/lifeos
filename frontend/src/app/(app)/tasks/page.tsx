"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import { TaskList } from "@/features/tasks/components/task-list";
import { TaskFormSheet } from "@/features/tasks/components/task-form-sheet";
import { useTasks } from "@/features/tasks/hooks";
import { computeTaskStats, searchTasks, sortTasks, type TaskSort } from "@/features/tasks/sort";
import type { TaskFilters as TaskFiltersValue } from "@/features/tasks/api";
import type { Task } from "@/types";

const SORT_ITEMS: Record<TaskSort, string> = {
  deadline: "Soonest deadline",
  priority: "Priority",
  created: "Newest first",
};

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  );
}

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Lazy initializer, same reasoning as `sheetOpen` below — a project card's
  // "view tasks" link lands here as `?projectId=X`, which should seed the
  // filter, not just sit unread in the URL.
  const [filters, setFilters] = useState<TaskFiltersValue>(() => {
    const projectId = searchParams.get("projectId");
    return projectId ? { projectId } : {};
  });
  const { data: tasks, isLoading } = useTasks(filters);
  // Lazy initializer, not an effect — deriving state from the URL at mount
  // is exactly what useState's initializer is for; setting it from an
  // effect instead trips react-hooks/set-state-in-effect and adds a
  // needless extra render. See the cleanup effect below for why the "new"
  // param still needs one (just not for this).
  const [sheetOpen, setSheetOpen] = useState(() => Boolean(searchParams.get("new")));
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TaskSort>("deadline");
  const searchInputRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setEditingTask(null);
    setSheetOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setSheetOpen(true);
  }

  // The command palette's "New Task" entry can't reach into this page's
  // local sheet state directly (it lives in the (app) layout, this page
  // doesn't exist yet when the palette renders) — a `?new=1` query param is
  // the simplest bridge, read once above via useState's lazy initializer
  // (not here — setting local state from an effect trips
  // react-hooks/set-state-in-effect and isn't necessary when the value is
  // already known at mount). This effect only cleans the param back out of
  // the URL, a genuine external-system action, so it doesn't linger and
  // re-open the sheet on a refresh/back-navigation. Mount-only by design:
  // navigating to /tasks?new=1 while already sitting on /tasks (no
  // remount) won't re-trigger this — a rare path anyway, since the page's
  // own "New task" button/`n` shortcut are right there once you're on it.
  useEffect(() => {
    if (searchParams.get("new")) {
      router.replace("/tasks");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page-level shortcuts — "master control" per docs/ARCHITECTURE.md: "/"
  // jumps to search, "n" opens the create sheet, from anywhere on the page
  // that isn't already mid-typing (so a task title can freely contain
  // either character). Bare keys only, no modifier — this mirrors the
  // command palette's own reasoning (frontend/DESIGN.md) for not
  // hijacking a browser/OS-owned combo.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        openCreate();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search + sort are client-side over the already-fetched (already
  // server-filtered by status/priority/category) list — see
  // features/tasks/sort.ts for why this doesn't need a backend endpoint.
  const visibleTasks = useMemo(() => {
    return sortTasks(searchTasks(tasks ?? [], search), sort);
  }, [tasks, search, sort]);

  const stats = useMemo(() => computeTaskStats(visibleTasks), [visibleTasks]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Tasks</h1>
        <Button onClick={openCreate}>
          <Plus />
          New task
          <kbd className="ml-1 font-mono text-xs opacity-70">n</kbd>
        </Button>
      </div>

      {/* Real, at-a-glance numbers — not decoration. Reflects whatever's
          currently visible (filters + search applied), so it always
          describes what's on screen, not some separate global count. */}
      {!isLoading && (
        <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
          <span>
            {stats.total} task{stats.total === 1 ? "" : "s"} shown
          </span>
          {stats.overdue > 0 && (
            <span className="font-semibold text-destructive">{stats.overdue} overdue</span>
          )}
          {stats.dueToday > 0 && (
            <span className="font-semibold text-accent-amber">{stats.dueToday} due today</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearch("");
                searchInputRef.current?.blur();
              }
            }}
            placeholder="Search tasks…"
            className="pr-7 pl-8"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-xs text-muted-foreground">
              /
            </kbd>
          )}
        </div>

        <TaskFilters filters={filters} onChange={setFilters} />

        <Select items={SORT_ITEMS} value={sort} onValueChange={(v) => setSort(v as TaskSort)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deadline">Soonest deadline</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="created">Newest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <TaskList tasks={visibleTasks} onEdit={openEdit} />
      )}

      <TaskFormSheet open={sheetOpen} onOpenChange={setSheetOpen} task={editingTask} />
    </div>
  );
}
