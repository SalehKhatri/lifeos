import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as tasksApi from "./api";
import type { TaskFilters, TaskInput, UpdateTaskInput } from "./api";
import { ApiError } from "@/lib/api-client";

export const taskKeys = {
  all: ["tasks"] as const,
  list: (filters: TaskFilters) => ["tasks", filters] as const,
};

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Task created");
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to create task")),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      tasksApi.updateTask(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Task updated");
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to update task")),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      toast.success("Task deleted");
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to delete task")),
  });
}

// No success toast here, deliberately — the checkbox toggle itself is the
// feedback for a frequent, low-stakes action; a toast on every completion
// would just be noise. Still surface failures, since those are unexpected.
export function useCompleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tasksApi.completeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to complete task")),
  });
}
