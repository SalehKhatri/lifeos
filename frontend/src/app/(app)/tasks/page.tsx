"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Search, X } from "lucide-react";
import { TRANSITION_FAST } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/query-error-state";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import { TaskList } from "@/features/tasks/components/task-list";
import { TaskFormSheet } from "@/features/tasks/components/task-form-sheet";
import { useTasks } from "@/features/tasks/hooks";
import {
  computeTaskStats,
  searchTasks,
  sortTasks,
  type TaskSort,
} from "@/features/tasks/sort";
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
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
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
  const { data: tasks, isLoading, isError, refetch } = useTasks(filters);
  // Lazy initializer, not an effect — deriving state from the URL at mount
  // is exactly what useState's initializer is for; setting it from an
  // effect instead trips react-hooks/set-state-in-effect and adds a
  // needless extra render. See the cleanup effect below for why the "new"
  // param still needs one (just not for this).
  const [sheetOpen, setSheetOpen] = useState(() =>
    Boolean(searchParams.get("new")),
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TaskSort>("deadline");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const SORT_ORDER: TaskSort[] = ["deadline", "priority", "created"];
  function cycleSort() {
    setSort(
      (current) =>
        SORT_ORDER[(SORT_ORDER.indexOf(current) + 1) % SORT_ORDER.length],
    );
  }

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
  // jumps to search, "n" opens the create sheet, "f" toggles the filters
  // popover, "s" cycles sort order — from anywhere on the page that isn't
  // already mid-typing (so a task title can freely contain any of these
  // characters). Bare keys only, no modifier — this mirrors the command
  // palette's own reasoning (frontend/DESIGN.md) for not hijacking a
  // browser/OS-owned combo.
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
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFiltersOpen((o) => !o);
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        cycleSort();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <span className="font-semibold text-destructive">
              {stats.overdue} overdue
            </span>
          )}
          {stats.dueToday > 0 && (
            <span className="font-semibold text-accent-amber">
              {stats.dueToday} due today
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-56 shrink-0">
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
            className="h-8 pr-7 pl-8"
          />
          {/* A crossfade, not an instant swap — this corner does two
              different jobs (shortcut hint vs. clear action) depending on
              whether there's a query, and the transition between them is
              itself a small confirmation that typing was registered. */}
          <AnimatePresence mode="wait">
            {search ? (
              <motion.button
                key="clear"
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={TRANSITION_FAST}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
              </motion.button>
            ) : (
              <motion.kbd
                key="hint"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={TRANSITION_FAST}
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-xs text-muted-foreground"
              >
                /
              </motion.kbd>
            )}
          </AnimatePresence>
        </div>

        <TaskFilters
          filters={filters}
          onChange={setFilters}
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
        />

        <Separator orientation="vertical" className="h-5" />

        <Select
          items={SORT_ITEMS}
          value={sort}
          onValueChange={(v) => setSort(v as TaskSort)}
        >
          <SelectTrigger className="h-8 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deadline">Soonest deadline</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="created">Newest first</SelectItem>
          </SelectContent>
        </Select>
        <kbd className="font-mono text-xs text-muted-foreground opacity-70">
          s
        </kbd>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : (
        <TaskList tasks={visibleTasks} onEdit={openEdit} />
      )}

      <TaskFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        task={editingTask}
      />
    </div>
  );
}
