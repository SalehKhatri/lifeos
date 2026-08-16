import { z } from "zod";

const dayOfWeekSchema = z.number().int().min(0, "Must be 0-6 (0=Sunday)").max(6, "Must be 0-6 (0=Sunday)");
const timeSchema = z.number().int().min(0).max(1439, "Must be minutes since midnight (0-1439)");
const labelSchema = z.string().trim().min(1, "Label cannot be empty").max(100);

export const createScheduleBlockSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    label: labelSchema,
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "startTime must be before endTime",
    path: ["endTime"],
  });

// Partial update — startTime < endTime is checked in the service after
// merging with the existing record, since either bound alone can't be
// validated against the other here.
export const updateScheduleBlockSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema.optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    label: labelSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const listScheduleBlocksQuerySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
});

export type CreateScheduleBlockInput = z.infer<typeof createScheduleBlockSchema>;
export type UpdateScheduleBlockInput = z.infer<typeof updateScheduleBlockSchema>;
export type ListScheduleBlocksQuery = z.infer<typeof listScheduleBlocksQuerySchema>;
