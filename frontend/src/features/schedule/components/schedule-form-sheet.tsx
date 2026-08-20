"use client";

import { useEffect } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2 } from "lucide-react";
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
import {
  useCreateScheduleBlocks,
  useReplaceScheduleBlocks,
  useUpdateScheduleBlock,
} from "@/features/schedule/hooks";
import type { ScheduleBlockInput } from "@/features/schedule/api";
import { MINUTES_PER_DAY, minutesToTimeInput, timeInputToMinutes } from "@/lib/time";
import type { ScheduleBlock } from "@/types";

const DAY_VALUES = ["0", "1", "2", "3", "4", "5", "6"] as const;
const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// An end time earlier than the start time isn't invalid — it means the
// commitment spans midnight (e.g. a 4pm-2am shift). Applies the same way
// whether creating or editing: onSubmit below decides how to realize it
// (create: N new blocks; edit: replace whatever block(s) represented the
// commitment with whatever the new values require — see
// useReplaceScheduleBlocks). The only truly invalid case is a zero-length
// block (start === end).
const scheduleFormSchema = z
  .object({
    label: z
      .string()
      .trim()
      .min(1, "Label is required")
      .max(100, "Label must be 100 characters or less"),
    // An array, not a single value — lets create mode pick multiple days at
    // once (e.g. "Work" for Mon-Fri in one action). Edit mode still only
    // ever has one entry, since it operates on one specific commitment.
    dayOfWeek: z.array(z.enum(DAY_VALUES)).min(1, "Select at least one day"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
  })
  .refine(
    (data) => {
      const start = timeInputToMinutes(data.startTime);
      const end = timeInputToMinutes(data.endTime);
      return start !== undefined && end !== undefined && start !== end;
    },
    { message: "Start and end time can't be the same", path: ["endTime"] },
  );

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

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

// `blocks` holds every row that makes up the commitment being edited: 0
// (create), 1 (an ordinary same-day block), or 2 (an overnight pair, head
// first — the caller is responsible for resolving the pair via `pairId`
// before opening this sheet, see week-calendar.tsx).
function valuesFromBlocks(blocks: ScheduleBlock[]): ScheduleFormValues {
  const [head, tail] = blocks;
  return {
    label: head.label,
    dayOfWeek: [String(head.dayOfWeek) as ScheduleFormValues["dayOfWeek"][number]],
    startTime: minutesToTimeInput(head.startTime),
    // A pair's true end time is the tail half's end, not the head half's
    // (which is always MINUTES_PER_DAY / midnight by construction).
    endTime: minutesToTimeInput(tail ? tail.endTime : head.endTime),
  };
}

interface ScheduleFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks?: ScheduleBlock[]; // empty/omitted = create mode
  // Only relevant (and rendered) in edit mode — the calendar grid opens
  // this sheet directly on click, with no separate per-block menu, so
  // delete lives here instead. The page still owns the actual delete
  // confirmation/mutation, same "parent owns mutations, child gets
  // callbacks" convention as everywhere else in the app.
  onDelete?: () => void;
}

export function ScheduleFormSheet({
  open,
  onOpenChange,
  blocks = [],
  onDelete,
}: ScheduleFormSheetProps) {
  const createBlocks = useCreateScheduleBlocks();
  const updateBlock = useUpdateScheduleBlock();
  const replaceBlocks = useReplaceScheduleBlocks();
  const isEditing = blocks.length > 0;

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
  // whenever a different commitment opens for edit, or the sheet re-opens
  // fresh.
  useEffect(() => {
    if (!open) return;
    reset(blocks.length > 0 ? valuesFromBlocks(blocks) : defaultValuesForNow());
  }, [open, blocks, reset]);

  // useWatch, not useForm's own `watch()` — the latter trips a React
  // Compiler "incompatible library" warning; useWatch is the
  // compiler-friendly equivalent (same pattern settled on for Settings'
  // form). Used here only to show a "spans midnight" hint live, not for
  // validation (the schema itself already handles that).
  const startTimeValue = useWatch({ control, name: "startTime" });
  const endTimeValue = useWatch({ control, name: "endTime" });
  const spansMidnight = (() => {
    const start = timeInputToMinutes(startTimeValue);
    const end = timeInputToMinutes(endTimeValue);
    return start !== undefined && end !== undefined && end < start;
  })();

  async function onSubmit(values: ScheduleFormValues) {
    const start = timeInputToMinutes(values.startTime)!;
    const end = timeInputToMinutes(values.endTime)!;
    const label = values.label;

    // A day whose end time is earlier than its start time spans midnight —
    // realized as two real blocks (today's evening half ending exactly at
    // midnight, tomorrow's early-morning half starting at 0) sharing a
    // pairId, since the data model has no way to represent "extends past
    // this day" on a single row. Applied per selected day, so a multi-day
    // overnight selection (e.g. a Mon-Fri night shift) splits each one
        // correctly, including the day-of-week wraparound.
    function blocksForDay(day: number, pairId?: string): ScheduleBlockInput[] {
      if (end < start) {
        const sharedPairId = pairId ?? crypto.randomUUID();
        return [
          { label, dayOfWeek: day, startTime: start, endTime: MINUTES_PER_DAY, pairId: sharedPairId },
          { label, dayOfWeek: (day + 1) % 7, startTime: 0, endTime: end, pairId: sharedPairId },
        ];
      }
      return [{ label, dayOfWeek: day, startTime: start, endTime: end }];
    }

    if (isEditing) {
      const day = Number(values.dayOfWeek[0]);
      const wasSpanning = blocks.length === 2;
      const willSpan = end < start;

      // Simple in-place PATCH only when the shape doesn't change (a plain
      // block staying a plain block) — cheaper, and keeps the same id.
      // Anything that changes shape (either side of the edit is a pair)
      // goes through the replace flow, since one PATCH can't turn one
      // block into two or vice versa.
      if (!wasSpanning && !willSpan) {
        await updateBlock.mutateAsync({
          id: blocks[0].id,
          input: { label, dayOfWeek: day, startTime: start, endTime: end },
        });
      } else {
        await replaceBlocks.mutateAsync({
          oldBlocks: blocks,
          newInputs: blocksForDay(day, wasSpanning ? blocks[0].pairId ?? undefined : undefined),
        });
      }
    } else {
      const inputs = values.dayOfWeek.flatMap((d) => blocksForDay(Number(d)));
      await createBlocks.mutateAsync(inputs);
    }
    onOpenChange(false);
  }

  const isPending = createBlocks.isPending || updateBlock.isPending || replaceBlocks.isPending;

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
                            // Editing operates on one specific commitment —
                            // a click replaces the selection rather than
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

          <SheetFooter className="flex-row">
            {isEditing && onDelete && (
              <Button type="button" variant="destructive" onClick={onDelete} disabled={isPending}>
                <Trash2 />
                Delete
              </Button>
            )}
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Create commitment"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
