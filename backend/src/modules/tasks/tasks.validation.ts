import { z } from "zod";
import { TaskStatus, TaskPriority } from "../../../generated/prisma/enums";

const titleSchema = z.string().trim().min(1, "Title cannot be empty").max(200);
const descriptionSchema = z.string().max(2000);
const estimatedDurationSchema = z.number().int().positive("Must be a positive number of minutes");
const deadlineSchema = z.coerce.date();

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  status: z.enum(TaskStatus).optional(),
  priority: z.enum(TaskPriority).optional(),
  estimatedDuration: estimatedDurationSchema,
  deadline: deadlineSchema.optional(),
  categoryId: z.string().optional(),
  projectId: z.string().optional(),
});

export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    status: z.enum(TaskStatus).optional(),
    priority: z.enum(TaskPriority).optional(),
    estimatedDuration: estimatedDurationSchema.optional(),
    deadline: deadlineSchema.nullable().optional(),
    categoryId: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const listTasksQuerySchema = z.object({
  status: z.enum(TaskStatus).optional(),
  priority: z.enum(TaskPriority).optional(),
  categoryId: z.string().optional(),
  projectId: z.string().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
