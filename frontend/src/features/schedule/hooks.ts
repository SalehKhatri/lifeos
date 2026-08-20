import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as scheduleApi from "./api";
import type { ScheduleFilters, ScheduleBlockInput, UpdateScheduleBlockInput } from "./api";
import { ApiError } from "@/lib/api-client";
import type { ScheduleBlock } from "@/types";

export const scheduleKeys = {
  all: ["schedule"] as const,
  list: (filters: ScheduleFilters) => ["schedule", filters] as const,
};

// Toast copy convention (see frontend/DESIGN.md): past-tense action + the
// identifying label, quoted, never a generic phrase.
function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useScheduleBlocks(filters: ScheduleFilters = {}) {
  return useQuery({
    queryKey: scheduleKeys.list(filters),
    queryFn: () => scheduleApi.listScheduleBlocks(filters),
  });
}

export function useCreateScheduleBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleBlockInput) => scheduleApi.createScheduleBlock(input),
    onSuccess: (block) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      toast.success(`Created "${block.label}"`);
    },
    onError: (err, input) => toast.error(errorMessage(err, `Couldn't create "${input.label}"`)),
  });
}

export function useUpdateScheduleBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateScheduleBlockInput }) =>
      scheduleApi.updateScheduleBlock(id, input),
    onSuccess: (block) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      toast.success(`Updated "${block.label}"`);
    },
    onError: (err, { input }) =>
      toast.error(errorMessage(err, `Couldn't update "${input.label ?? "block"}"`)),
  });
}

export function useDeleteScheduleBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (block: ScheduleBlock) => scheduleApi.deleteScheduleBlock(block.id),
    onSuccess: (_data, block) => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      toast.success(`Deleted "${block.label}"`);
    },
    onError: (err, block) => toast.error(errorMessage(err, `Couldn't delete "${block.label}"`)),
  });
}
