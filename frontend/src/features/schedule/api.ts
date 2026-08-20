import { apiFetch, toQueryString } from "@/lib/api-client";
import type { ScheduleBlock } from "@/types";

export interface ScheduleFilters {
  dayOfWeek?: number;
}

export interface ScheduleBlockInput {
  dayOfWeek: number; // 0-6, 0 = Sunday
  startTime: number; // minutes since midnight
  endTime: number;
  label: string;
}

// Every field optional on update (backend still requires at least one),
// but none nullable — unlike Tasks/Projects, nothing on a ScheduleBlock can
// be explicitly cleared to null, so create/update payloads don't need the
// undefined-vs-null split documented in frontend/DESIGN.md for those forms.
export type UpdateScheduleBlockInput = Partial<ScheduleBlockInput>;

export async function listScheduleBlocks(
  filters: ScheduleFilters = {},
): Promise<ScheduleBlock[]> {
  const { scheduleBlocks } = await apiFetch<{ scheduleBlocks: ScheduleBlock[] }>(
    `/schedule${toQueryString(filters)}`,
  );
  return scheduleBlocks;
}

export async function createScheduleBlock(input: ScheduleBlockInput): Promise<ScheduleBlock> {
  const { scheduleBlock } = await apiFetch<{ scheduleBlock: ScheduleBlock }>("/schedule", {
    method: "POST",
    body: input,
  });
  return scheduleBlock;
}

export async function updateScheduleBlock(
  id: string,
  input: UpdateScheduleBlockInput,
): Promise<ScheduleBlock> {
  const { scheduleBlock } = await apiFetch<{ scheduleBlock: ScheduleBlock }>(
    `/schedule/${id}`,
    { method: "PATCH", body: input },
  );
  return scheduleBlock;
}

export async function deleteScheduleBlock(id: string): Promise<void> {
  await apiFetch(`/schedule/${id}`, { method: "DELETE" });
}
