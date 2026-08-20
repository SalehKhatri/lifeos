"use client";

import { useEffect } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
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
import { FormField } from "@/components/form-field";
import { cn } from "@/lib/utils";
import { useCreateScheduleBlocks, useUpdateScheduleBlock } from "@/features/schedule/hooks";
import type { ScheduleBlockInput } from "@/features/schedule/api";
import { MINUTES_PER_DAY, minutesToTimeInput, timeInputToMinutes } from "@/lib/time";
import type { ScheduleBlock } from "@/types";

const DAY_VALUES = ["0", "1", "2", "3", "4", "5", "6"] as const;
const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Create mode allows an end time earlier than the start time — that's not
// invalid, it means the commitment spans midnight (e.g. a 4pm-2am shift).
// Edit mode can't represent that: it updates a single existing block, which
// can only ever hold one calendar day's worth of minutes (see
// ScheduleBlockInput/the backend's timeSchema, capped at 1439) — so editing
// keeps the strict same-day check. See onSubmit below for how create mode
// actually realizes a spanning entry as two real blocks.
function buildScheduleFormSchema(isEditing: boolean) {
  return z
    .object({
      label: z
        .string()
        .trim()
        .min(1, "Label is required")
        .max(100, "Label must be 100 characters or less"),
      // An array, not a single value — lets create mode pick multiple days
      // at once (e.g. "Work" for Mon-Fri in one action). Edit mode still
      // only ever has one entry, since it operates on a single existing
      // block.
      dayOfWeek: z.array(z.enum(DAY_VALUES)).min(1, "Select at least one day"),
      startTime: z.string().min(1, "Start time is required"),
      endTime: z.string().min(1, "End time is required"),
    })
    .refine(
      (data) => {
        const start = timeInputToMinutes(data.startTime);
        const end = timeInputToMinutes(data.endTime);
        if (start === undefined || end === undefined) return false;
        if (isEditing) return start < end;
        return start !== end; // create: only a zero-length block is invalid
      },
      {
        message: isEditing
          ? "Start time must be before end time"
          : "Start and end time can't be the same",
        path: ["endTime"],
      },
    );
}

type ScheduleFormValues = z.infer<ReturnType<typeof buildScheduleFormSchema>>;

// A sensible non-blank starting point, computed fresh every time the sheet
// opens for create (not baked into a static constant) — same reasoning as
// Task/Project deadlines defaulting to "now". Rounds to the next full hour
// rather than the exact current minute: "3:47 PM–4:47 PM" reads oddly for a
// recurring weekly commitment, "4:00 PM–5:00 PM" doesn't.
function defaultValuesForNow(): ScheduleFormValues {
  const now = new Date();
  const startHour = (now.getHours() + 1) % 24;
  const start = startHour * 60;
  const end = (start + 60) % MINUTES_PER_DAY;
  return {
    label: "",
    dayOfWeek: [String(now.getDay()) as ScheduleFormValues["dayOfWeek"][number]],
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
  const createBlocks = useCreateScheduleBlocks();
  const updateBlock = useUpdateScheduleBlock();
  const isEditing = Boolean(block);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(buildScheduleFormSchema(isEditing)),
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
            dayOfWeek: [String(block.dayOfWeek) as ScheduleFormValues["dayOfWeek"][number]],
            startTime: minutesToTimeInput(block.startTime),
            endTime: minutesToTimeInput(block.endTime),
          }
        : defaultValuesForNow(),
    );
  }, [open, block, reset]);

  // useWatch, not useForm's own `watch()` — the latter trips a React
  // Compiler "incompatible library" warning (it returns a plain function
  // rather than being a proper subscription hook); useWatch is the
  // compiler-friendly equivalent, same pattern already settled on for
  // Settings' form. Used here only to show a "spans midnight" hint live,
  // not for validation (the schema itself already handles that).
  const startTimeValue = useWatch({ control, name: "startTime" });
  const endTimeValue = useWatch({ control, name: "endTime" });
  const spansMidnight =
    !isEditing &&
    (() => {
      const start = timeInputToMinutes(startTimeValue);
      const end = timeInputToMinutes(endTimeValue);
      return start !== undefined && end !== undefined && end < start;
    })();

  async function onSubmit(values: ScheduleFormValues) {
    const start = timeInputToMinutes(values.startTime)!;
    const end = timeInputToMinutes(values.endTime)!;
    const label = values.label;

    if (isEditing && block) {
      // Every field required by the backend on the update path (once
      // present) — no nullable-field split to worry about here, unlike
      // Tasks/Projects (see frontend/DESIGN.md).
      await updateBlock.mutateAsync({
        id: block.id,
        input: { label, dayOfWeek: Number(values.dayOfWeek[0]), startTime: start, endTime: end },
      });
    } else {
      // A day whose end time is earlier than its start time spans
      // midnight — realized as two real blocks (today's evening half,
      // tomorrow's early-morning half), since the data model has no way
      // to represent "extends past this day" on a single row. Applied
      // per selected day, so a multi-day overnight selection (e.g. a
      // Mon-Fri night shift) splits each one correctly, including the
      // day-of-week wraparound (Saturday's "tomorrow" is Sunday).
      const inputs: ScheduleBlockInput[] = values.dayOfWeek.flatMap((d) => {
        const day = Number(d);
        if (end < start) {
          return [
            { label, dayOfWeek: day, startTime: start, endTime: MINUTES_PER_DAY - 1 },
            { label, dayOfWeek: (day + 1) % 7, startTime: 0, endTime: end },
          ];
        }
        return [{ label, dayOfWeek: day, startTime: start, endTime: end }];
      });
      await createBlocks.mutateAsync(inputs);
    }
    onOpenChange(false);
  }

  const isPending = createBlocks.isPending || updateBlock.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading">
            {isEditing ? "Edit commitment" : "New commitment"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the details below."
              : "Block off recurring time on your week — pick more than one day if it repeats, or set an end time earlier than the start if it runs past midnight."}
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

            <FormField
              label={isEditing ? "Day" : "Days"}
              htmlFor="dayOfWeek"
              error={errors.dayOfWeek?.message}
            >
              <Controller
                control={control}
                name="dayOfWeek"
                render={({ field }) => (
                  <div id="dayOfWeek" className="flex gap-1">
                    {DAY_VALUES.map((v, i) => {
                      const active = field.value.includes(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            // Editing operates on one existing block — a
                            // click replaces the selection rather than
                            // toggling it. Creating allows multiple.
                            if (isEditing) {
                              field.onChange([v]);
                            } else {
                              field.onChange(
                                active
                                  ? field.value.filter((d) => d !== v)
                                  : [...field.value, v],
                              );
                            }
                          }}
                          className={cn(
                            "flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "border-accent-cyan bg-accent-cyan/15 text-accent-cyan"
                              : "border-input text-muted-foreground hover:border-accent-cyan/40",
                          )}
                        >
                          {DAY_SHORT[i]}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start time" htmlFor="startTime" error={errors.startTime?.message}>
                <Input id="startTime" type="time" {...register("startTime")} />
              </FormField>

              <FormField
                label="End time"
                htmlFor="endTime"
                error={errors.endTime?.message}
                hint={spansMidnight ? "Ends the next day" : undefined}
              >
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
