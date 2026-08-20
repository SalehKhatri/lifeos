"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { useCreateScheduleBlock, useUpdateScheduleBlock } from "@/features/schedule/hooks";
import { DAY_LABELS, minutesToTimeInput, timeInputToMinutes } from "@/lib/time";
import type { ScheduleBlock } from "@/types";

const DAY_VALUES = ["0", "1", "2", "3", "4", "5", "6"] as const;

const scheduleFormSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Label is required")
      .max(100, "Label must be 100 characters or less"),
    dayOfWeek: z.enum(DAY_VALUES),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
  })
  // Mirrors the backend's own cross-field check (schedule.validation.ts) so
  // the mistake surfaces immediately instead of after a round trip.
  .refine(
    (data) => {
      const start = timeInputToMinutes(data.startTime);
      const end = timeInputToMinutes(data.endTime);
      return start !== undefined && end !== undefined && start < end;
    },
    { message: "Start time must be before end time", path: ["endTime"] },
  );

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

// Select.Value's items map — see frontend/DESIGN.md's gotcha (a pre-filled
// value needs this; the popup being opened first can't be relied on).
const DAY_ITEMS: Record<string, string> = Object.fromEntries(
  DAY_VALUES.map((v) => [v, DAY_LABELS[Number(v)]]),
);

// A sensible non-blank starting point, computed fresh every time the sheet
// opens for create (not baked into a static constant) — same reasoning as
// Task/Project deadlines defaulting to "now". Rounds to the next full hour
// rather than the exact current minute: "3:47 PM–4:47 PM" reads oddly for a
// recurring weekly commitment, "4:00 PM–5:00 PM" doesn't.
function defaultValuesForNow(): ScheduleFormValues {
  const now = new Date();
  const startHour = (now.getHours() + 1) % 24;
  const start = startHour * 60;
  const end = (start + 60) % 1440;
  return {
    label: "",
    dayOfWeek: String(now.getDay()) as ScheduleFormValues["dayOfWeek"],
    startTime: minutesToTimeInput(start),
    endTime: minutesToTimeInput(end),
  };
}

interface ScheduleFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block?: ScheduleBlock | null; // omitted/null = create mode
}

export function ScheduleFormSheet({ open, onOpenChange, block }: ScheduleFormSheetProps) {
  const createBlock = useCreateScheduleBlock();
  const updateBlock = useUpdateScheduleBlock();
  const isEditing = Boolean(block);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: defaultValuesForNow(),
  });

  // react-hook-form only applies defaultValues on first mount — re-seed
  // whenever a different block opens for edit, or the sheet re-opens fresh.
  useEffect(() => {
    if (!open) return;
    reset(
      block
        ? {
            label: block.label,
            dayOfWeek: String(block.dayOfWeek) as ScheduleFormValues["dayOfWeek"],
            startTime: minutesToTimeInput(block.startTime),
            endTime: minutesToTimeInput(block.endTime),
          }
        : defaultValuesForNow(),
    );
  }, [open, block, reset]);

  async function onSubmit(values: ScheduleFormValues) {
    // Every field required by the backend on both create and update paths
    // (once present) — no nullable-field split to worry about here, unlike
    // Tasks/Projects (see frontend/DESIGN.md).
    const payload = {
      label: values.label,
      dayOfWeek: Number(values.dayOfWeek),
      startTime: timeInputToMinutes(values.startTime)!,
      endTime: timeInputToMinutes(values.endTime)!,
    };

    if (isEditing && block) {
      await updateBlock.mutateAsync({ id: block.id, input: payload });
    } else {
      await createBlock.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const isPending = createBlock.isPending || updateBlock.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading">
            {isEditing ? "Edit commitment" : "New commitment"}
          </SheetTitle>
          <SheetDescription>
            {isEditing ? "Update the details below." : "Block off recurring time on your week."}
          </SheetDescription>
        </SheetHeader>

        {/* Submit button lives inside this form (in the footer) so Enter in
            any text field submits natively — no click-through required. */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col overflow-hidden"
          noValidate
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            <FormField label="Label" htmlFor="label" error={errors.label?.message}>
              <Input id="label" autoFocus placeholder="e.g. Gym, Work, Class" {...register("label")} />
            </FormField>

            <FormField label="Day" htmlFor="dayOfWeek" error={errors.dayOfWeek?.message}>
              <Controller
                control={control}
                name="dayOfWeek"
                render={({ field }) => (
                  <Select items={DAY_ITEMS} value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="dayOfWeek" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAY_VALUES.map((v) => (
                        <SelectItem key={v} value={v}>
                          {DAY_LABELS[Number(v)]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start time" htmlFor="startTime" error={errors.startTime?.message}>
                <Input id="startTime" type="time" {...register("startTime")} />
              </FormField>

              <FormField label="End time" htmlFor="endTime" error={errors.endTime?.message}>
                <Input id="endTime" type="time" {...register("endTime")} />
              </FormField>
            </div>
          </div>

          <SheetFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Create commitment"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
