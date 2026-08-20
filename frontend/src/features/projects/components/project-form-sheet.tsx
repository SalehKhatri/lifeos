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
import { useCreateProject, useUpdateProject } from "@/features/projects/hooks";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "@/lib/datetime";
import type { Project } from "@/types";

const projectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  description: z.string().max(2000, "Description must be 2000 characters or less").optional(),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]),
  deadline: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

// Status items map for Select.Value's label resolution — see
// frontend/DESIGN.md's Select.Value gotcha (a pre-filled value needs this,
// the popup being opened first can't be relied on).
const STATUS_ITEMS: Record<ProjectFormValues["status"], string> = {
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const EMPTY_VALUES: ProjectFormValues = {
  name: "",
  description: "",
  status: "ACTIVE",
  deadline: "",
};

interface ProjectFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null; // omitted/null = create mode
}

export function ProjectFormSheet({ open, onOpenChange, project }: ProjectFormSheetProps) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const isEditing = Boolean(project);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  // react-hook-form only applies defaultValues on first mount — re-seed
  // whenever a different project opens for edit, or the sheet re-opens fresh.
  useEffect(() => {
    if (!open) return;
    reset(
      project
        ? {
            name: project.name,
            description: project.description ?? "",
            status: project.status,
            deadline: toDatetimeLocalValue(project.deadline),
          }
        // Deadline defaults to right now, not empty — same reasoning as
        // the task form: starting from "now" (still fully editable) beats
        // picking both a date and a time from a blank field every time.
        : { ...EMPTY_VALUES, deadline: toDatetimeLocalValue(new Date().toISOString()) },
    );
  }, [open, project, reset]);

  async function onSubmit(values: ProjectFormValues) {
    const payload = {
      name: values.name,
      description: values.description?.trim() ? values.description : undefined,
      status: values.status,
      deadline: fromDatetimeLocalValue(values.deadline),
    };

    if (isEditing && project) {
      await updateProject.mutateAsync({
        id: project.id,
        input: { ...payload, deadline: payload.deadline ?? null },
      });
    } else {
      await createProject.mutateAsync(payload);
    }
    onOpenChange(false);
  }

  const isPending = createProject.isPending || updateProject.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-heading">
            {isEditing ? "Edit project" : "New project"}
          </SheetTitle>
          <SheetDescription>
            {isEditing ? "Update the details below." : "What are you working towards?"}
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
            <FormField label="Name" htmlFor="name" error={errors.name?.message}>
              <Input id="name" autoFocus {...register("name")} />
            </FormField>

            <FormField
              label="Description"
              htmlFor="description"
              error={errors.description?.message}
            >
              <Textarea id="description" rows={3} {...register("description")} />
            </FormField>

            {isEditing && (
              <FormField label="Status" htmlFor="status" error={errors.status?.message}>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select items={STATUS_ITEMS} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="status" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ON_HOLD">On hold</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}

            <FormField label="Deadline" htmlFor="deadline" error={errors.deadline?.message}>
              <Input id="deadline" type="datetime-local" {...register("deadline")} />
            </FormField>
          </div>

          <SheetFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEditing ? "Save changes" : "Create project"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
