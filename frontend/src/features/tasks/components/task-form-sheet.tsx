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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/form-field";
import { CategoryManager } from "@/features/categories/components/category-manager";
import { useCategories } from "@/features/categories/hooks";
import { useCreateTask, useUpdateTask } from "@/features/tasks/hooks";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "@/lib/datetime";
import type { Task } from "@/types";

const taskFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]),
  // Plain z.number(), not z.coerce.number() — coerce gives the schema a
  // different input vs output type (string in, number out), which trips up
  // useForm<T>'s generic (T is the output shape). register(..., {
  // valueAsNumber: true }) below does the DOM string->number conversion
  // instead, keeping the type `number` on both sides.
  estimatedDuration: z.number().int().positive("Must be a positive number of minutes"),
  deadline: z.string().optional(),
  categoryId: z.string().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

const NO_CATEGORY = "__none__";

const EMPTY_VALUES: TaskFormValues = {
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "TODO",
  estimatedDuration: 30,
  deadline: "",
  categoryId: NO_CATEGORY,
};

interface TaskFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null; // omitted/null = create mode
}

// Project select is intentionally not here yet — Projects (Phase 3) doesn't
// exist on the frontend yet to list from. Add once that lands.
export function TaskFormSheet({ open, onOpenChange, task }: TaskFormSheetProps) {
  const { data: categories } = useCategories();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isEditing = Boolean(task);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  // react-hook-form only applies defaultValues on first mount — re-seed
  // whenever a different task opens for edit, or the sheet re-opens fresh.
  useEffect(() => {
    if (!open) return;
    reset(
      task
        ? {
            title: task.title,
            description: task.description ?? "",
            priority: task.priority,
            status: task.status,
            estimatedDuration: task.estimatedDuration,
            deadline: toDatetimeLocalValue(task.deadline),
            categoryId: task.categoryId ?? NO_CATEGORY,
          }
        : EMPTY_VALUES,
    );
  }, [open, task, reset]);

  async function onSubmit(values: TaskFormValues) {
    const payload = {
      title: values.title,
      description: values.description?.trim() ? values.description : null,
      priority: values.priority,
      status: values.status,
      estimatedDuration: values.estimatedDuration,
      deadline: fromDatetimeLocalValue(values.deadline) ?? null,
      categoryId: values.categoryId === NO_CATEGORY ? null : values.categoryId,
    };

    if (isEditing && task) {
      await updateTask.mutateAsync({ id: task.id, input: payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const isPending = createTask.isPending || updateTask.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading">{isEditing ? "Edit task" : "New task"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update the details below." : "What needs to get done?"}
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
            <FormField label="Title" htmlFor="title" error={errors.title?.message}>
              <Input id="title" autoFocus {...register("title")} />
            </FormField>

            <FormField
              label="Description"
              htmlFor="description"
              error={errors.description?.message}
            >
              <Textarea id="description" rows={3} {...register("description")} />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Priority" htmlFor="priority" error={errors.priority?.message}>
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="priority" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                label="Duration (min)"
                htmlFor="estimatedDuration"
                error={errors.estimatedDuration?.message}
              >
                <Input
                  id="estimatedDuration"
                  type="number"
                  min={1}
                  {...register("estimatedDuration", { valueAsNumber: true })}
                />
              </FormField>
            </div>

            {isEditing && (
              <FormField label="Status" htmlFor="status" error={errors.status?.message}>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">To do</SelectItem>
                        <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}

            <FormField label="Deadline" htmlFor="deadline" error={errors.deadline?.message}>
              <Input id="deadline" type="datetime-local" {...register("deadline")} />
            </FormField>

            <FormField label="Category" htmlFor="categoryId" error={errors.categoryId?.message}>
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="categoryId" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: category.color ?? undefined }}
                              />
                              {category.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <CategoryManager />
              </div>
            </FormField>
          </div>

          <SheetFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Create task"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
