import { z } from "zod";

const dayOfWeekSchema = z.number().int().min(0, "Must be 0-6 (0=Sunday)").max(6, "Must be 0-6 (0=Sunday)");
// startTime and endTime are NOT the same range. A block can start anywhere
// from minute 0 up to minute 1439 (the last minute of the day) — but it can
// legitimately *end* exactly at midnight, i.e. minute 1440, one past the
// last valid start. Sharing one 0-1439 schema between both fields meant
// "ends at midnight" had no valid representation — the frontend's overnight
// -split feature was capping the evening half's endTime at 1439 (11:59 PM)
// instead of 1440 (true midnight), silently losing exactly 1 minute per
// split (user-reported: 4 minutes short across a week with ~4 splits).
const startTimeSchema = z.number().int().min(0).max(1439, "Must be minutes since midnight (0-1439)");
const endTimeSchema = z
  .number()
  .int()
  .min(0)
  .max(1440, "Must be minutes since midnight (0-1440, where 1440 = midnight)");
const labelSchema = z.string().trim().min(1, "Label cannot be empty").max(100);
// Client-generated (crypto.randomUUID()), not validated for a specific
// shape — it's an opaque grouping tag (see schema.prisma's comment on
// ScheduleBlock.pairId), not a real ID the backend ever generates or
// dereferences itself, so it just needs to be a reasonable string.
const pairIdSchema = z.string().trim().min(1).max(100);

export const createScheduleBlockSchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    startTime: startTimeSchema,
    endTime: endTimeSchema,
    label: labelSchema,
    pairId: pairIdSchema.optional(),
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
    startTime: startTimeSchema.optional(),
    endTime: endTimeSchema.optional(),
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
