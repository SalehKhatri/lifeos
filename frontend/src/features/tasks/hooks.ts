import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as tasksApi from "./api";
import type { TaskFilters, TaskInput, UpdateTaskInput } from "./api";
import { ApiError } from "@/lib/api-client";
import type { Task, TaskStatus } from "@/types";

export const taskKeys = {
  all: ["tasks"] as const,
  list: (filters: TaskFilters) => ["tasks", filters] as const,
};

// Toast copy convention (see frontend/DESIGN.md): success messages are
// past-tense + the identifying title, not a generic phrase like "Task
// updated successfully". Error fallbacks (only shown when the backend
// didn't return a specific message) follow the same "<verb> <title>" shape
// so a failure reads as concretely as the success it didn't get to be.
function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: taskKeys.list(filters),
    queryFn: () => tasksApi.listTasks(filters),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => tasksApi.createTask(input),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success(`Created "${task.title}"`);
    },
    onError: (err, input) =>
      toast.error(errorMessage(err, `Couldn't create "${input.title}"`)),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      tasksApi.updateTask(id, input),
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success(`Updated "${task.title}"`);
    },
    onError: (err, { input }) =>
      toast.error(errorMessage(err, `Couldn't update "${input.title ?? "task"}"`)),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => tasksApi.deleteTask(task.id),
    onSuccess: (_data, task) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success(`Deleted "${task.title}"`);
    },
    onError: (err, task) => toast.error(errorMessage(err, `Couldn't delete "${task.title}"`)),
  });
}

// Not currently used by the Tasks list — that now goes through the general
// useSetTaskStatus below (the card's unified status Select can set DONE
// directly; the backend's PATCH /tasks/:id already manages completedAt
// correctly for any status transition, confirmed against
// tasks.service.ts). Kept for a likely future single-action "mark done"
// affordance (e.g. the Today page's top-task card, Phase 5) where a
// dedicated complete endpoint's slightly tighter idempotency semantics are
// a better fit than exposing the full 3-state dropdown. No success toast,
// deliberately — see useSetTaskStatus below for the same reasoning.
export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (task: Task) => tasksApi.completeTask(task.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (err, task) =>
      toast.error(errorMessage(err, `Couldn't mark "${task.title}" as done`)),
  });
}

// General status-only update, same no-success-toast treatment as complete
// above — this backs both "reopen" (from the checkbox) and the inline
// To Do/In Progress toggle on the card, neither of which should need a
// trip through the edit Sheet just to move a task along. A quick status
// click is exactly as frequent/low-stakes as the checkbox, so it gets the
// same quiet treatment, not the edit form's "Updated ..." toast.
export function useSetTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, status }: { task: Task; status: TaskStatus }) =>
      tasksApi.updateTask(task.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (err, { task }) =>
      toast.error(errorMessage(err, `Couldn't update "${task.title}"`)),
  });
}
