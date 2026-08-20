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

// Takes an array, not a single input — the create form lets you pick
// multiple days at once (e.g. "Work" for Mon-Fri in one action, rather than
// creating the identical block 5 separate times). A single day is just an
// array of length 1, so there's one hook for both cases, not two.
//
// Promise.allSettled, not Promise.all: with several independent creates in
// flight, one failing (rare — a network blip, since the payload's validity
// doesn't depend on which day it's for) shouldn't hide that the others
// actually succeeded. Reports a single consolidated toast either way,
// rather than one per day.
export function useCreateScheduleBlocks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputs: ScheduleBlockInput[]) =>
      Promise.allSettled(inputs.map((input) => scheduleApi.createScheduleBlock(input))),
    onSuccess: (results, inputs) => {
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      const label = inputs[0]?.label ?? "commitment";

      if (succeeded > 0) {
        queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      }
      if (failed === 0) {
        toast.success(succeeded === 1 ? `Created "${label}"` : `Created "${label}" for ${succeeded} days`);
      } else if (succeeded > 0) {
        toast.error(`Created "${label}" for ${succeeded} day(s), ${failed} failed`);
      } else {
        toast.error(`Couldn't create "${label}"`);
      }
    },
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
