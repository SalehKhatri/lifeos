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

// No success toast for complete/reopen, deliberately and symmetrically —
// the checkbox's own visual state is the feedback for this frequent,
// low-stakes toggle; a toast on every click (in either direction) would be
// noise. Only surface failures, since those are unexpected. (Previously
// "reopen" reused the generic useUpdateTask mutation above, which *does*
// toast on success — that mismatch, checkbox-toggle-toasts-one-way-but-not-
// the-other, was the reported bug; these two hooks now mirror each other.)
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
