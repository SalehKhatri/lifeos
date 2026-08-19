"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskFilters } from "@/features/tasks/components/task-filters";
import { TaskList } from "@/features/tasks/components/task-list";
import { TaskFormSheet } from "@/features/tasks/components/task-form-sheet";
import { useTasks } from "@/features/tasks/hooks";
import type { TaskFilters as TaskFiltersValue } from "@/features/tasks/api";
import type { Task } from "@/types";

export default function TasksPage() {
  const [filters, setFilters] = useState<TaskFiltersValue>({});
  const { data: tasks, isLoading } = useTasks(filters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  function openCreate() {
    setEditingTask(null);
    setSheetOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Tasks</h1>
        <Button onClick={openCreate}>
          <Plus />
          New task
        </Button>
      </div>

      <TaskFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <TaskList tasks={tasks ?? []} onEdit={openEdit} />
      )}

      <TaskFormSheet open={sheetOpen} onOpenChange={setSheetOpen} task={editingTask} />
    </div>
  );
}
