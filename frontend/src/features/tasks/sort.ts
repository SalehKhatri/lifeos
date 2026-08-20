import { getDeadlineUrgency } from "@/lib/datetime";
import type { Task, TaskPriority } from "@/types";

export type TaskSort = "deadline" | "priority" | "created";

const PRIORITY_RANK: Record<TaskPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

// Client-side only — sorting/searching the already-fetched (already
// server-filtered by status/priority/category) list. No backend endpoint
// for either exists yet, and doesn't need to: this is cheap over a
// single-user's task list size, and keeps the sort/search feature entirely
// frontend-scoped (no new API surface for something this small).
export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const sorted = [...tasks];
  switch (sort) {
    case "deadline":
      sorted.sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1; // no deadline sinks to the bottom
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
      break;
    case "priority":
      sorted.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
      break;
    case "created":
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }
  return sorted;
}

export function searchTasks(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter((t) => t.title.toLowerCase().includes(q));
}

export interface TaskStats {
  total: number;
  overdue: number;
  dueToday: number;
}

export function computeTaskStats(tasks: Task[]): TaskStats {
  let overdue = 0;
  let dueToday = 0;
  for (const task of tasks) {
    const urgency = getDeadlineUrgency(task.deadline, task.status === "DONE");
    if (urgency === "overdue") overdue++;
    if (urgency === "due-today") dueToday++;
  }
  return { total: tasks.length, overdue, dueToday };
}
