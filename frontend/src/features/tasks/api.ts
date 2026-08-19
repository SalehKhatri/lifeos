import { apiFetch, toQueryString } from "@/lib/api-client";
import type { Task, TaskStatus, TaskPriority } from "@/types";

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  categoryId?: string;
  projectId?: string;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  estimatedDuration: number;
  deadline?: string | null; // ISO datetime
  categoryId?: string | null;
  projectId?: string | null;
}

export type UpdateTaskInput = Partial<TaskInput>;

export async function listTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const { tasks } = await apiFetch<{ tasks: Task[] }>(`/tasks${toQueryString(filters)}`);
  return tasks;
}

export async function createTask(input: TaskInput): Promise<Task> {
  const { task } = await apiFetch<{ task: Task }>("/tasks", { method: "POST", body: input });
  return task;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  const { task } = await apiFetch<{ task: Task }>(`/tasks/${id}`, {
    method: "PATCH",
    body: input,
  });
  return task;
}

export async function deleteTask(id: string): Promise<void> {
  await apiFetch(`/tasks/${id}`, { method: "DELETE" });
}

export async function completeTask(id: string): Promise<Task> {
  const { task } = await apiFetch<{ task: Task }>(`/tasks/${id}/complete`, { method: "POST" });
  return task;
}
