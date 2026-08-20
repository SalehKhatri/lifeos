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
      // Distinct days touched, not the raw block count — an overnight
      // commitment that spans midnight becomes 2 blocks under the hood
      // (schedule-form-sheet.tsx splits it at the day boundary) but is
      // still one thing from the user's perspective (now formally tracked
      // via a shared `pairId`). "for 2 days" still reads sensibly there,
      // since they just entered a time crossing midnight themselves — same
      // phrasing, same reasoning as an actual multi-day selection.
      const distinctDays = new Set(inputs.map((i) => i.dayOfWeek)).size;

      if (succeeded > 0) {
        queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      }
      if (failed === 0) {
        toast.success(
          distinctDays <= 1 ? `Created "${label}"` : `Created "${label}" for ${distinctDays} days`,
        );
      } else if (succeeded > 0) {
        toast.error(`Created "${label}" partially — some parts failed, double check your schedule`);
      } else {
        toast.error(`Couldn't create "${label}"`);
      }
    },
  });
}

// Simple in-place PATCH — only used when editing a commitment whose shape
// stays a single same-day block both before and after (the common case).
// Anything involving a pair (either side of the edit) goes through
// useReplaceScheduleBlocks instead, since a single PATCH can't turn one
// block into two or vice versa.
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

// Handles every edit that changes shape — a plain block becoming an
// overnight pair, a pair becoming a plain block, or a pair's times moving
// enough that both halves need recomputing. Reconciling that field-by-field
// via PATCH would mean handling four different before/after shape
// combinations; instead this just creates whatever block(s) the new values
// require and deletes whatever block(s) represented the commitment before.
//
// Create-first, not delete-first: if the new block(s) fail to create, the
// old ones are still there and nothing is lost. If only some of the new
// ones succeed, roll those back rather than leaving a mix of old and
// partial-new data — worst case, the edit just doesn't take effect.
export function useReplaceScheduleBlocks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      oldBlocks,
      newInputs,
    }: {
      oldBlocks: ScheduleBlock[];
      newInputs: ScheduleBlockInput[];
    }) => {
      const created = await Promise.allSettled(
        newInputs.map((input) => scheduleApi.createScheduleBlock(input)),
      );
      const allSucceeded = created.every((r) => r.status === "fulfilled");

      if (allSucceeded) {
        await Promise.allSettled(oldBlocks.map((b) => scheduleApi.deleteScheduleBlock(b.id)));
      } else {
        const succeededOnes = created.filter(
          (r): r is PromiseFulfilledResult<ScheduleBlock> => r.status === "fulfilled",
        );
        await Promise.allSettled(succeededOnes.map((r) => scheduleApi.deleteScheduleBlock(r.value.id)));
      }
      return allSucceeded;
    },
    onSuccess: (allSucceeded, { newInputs }) => {
      const label = newInputs[0]?.label ?? "commitment";
      if (allSucceeded) {
        queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
        toast.success(`Updated "${label}"`);
      } else {
        toast.error(`Couldn't update "${label}" — nothing was changed, try again`);
      }
    },
    onError: (_err, { newInputs }) =>
      toast.error(`Couldn't update "${newInputs[0]?.label ?? "commitment"}" — nothing was changed, try again`),
  });
}

// Takes an array, not a single block — deleting an overnight commitment
// needs to remove both of its halves in one user action, one confirmation,
// one toast, not two separate delete flows. A normal single block is just
// an array of length 1.
export function useDeleteScheduleBlocks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (blocks: ScheduleBlock[]) =>
      Promise.allSettled(blocks.map((b) => scheduleApi.deleteScheduleBlock(b.id))),
    onSuccess: (results, blocks) => {
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      const label = blocks[0]?.label ?? "commitment";

      if (succeeded > 0) {
        queryClient.invalidateQueries({ queryKey: scheduleKeys.all });
      }
      if (failed === 0) {
        toast.success(`Deleted "${label}"`);
      } else if (succeeded > 0) {
        toast.error(`Deleted "${label}" partially — some parts failed, double check your schedule`);
      } else {
        toast.error(`Couldn't delete "${label}"`);
      }
    },
  });
}
