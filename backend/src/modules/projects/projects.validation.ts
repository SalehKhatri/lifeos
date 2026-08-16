import { z } from "zod";
import { ProjectStatus } from "../../../generated/prisma/enums";

const nameSchema = z.string().trim().min(1, "Name cannot be empty").max(200);
const descriptionSchema = z.string().max(2000);
const deadlineSchema = z.coerce.date();

export const createProjectSchema = z.object({
  name: nameSchema,
  description: descriptionSchema.optional(),
  status: z.enum(ProjectStatus).optional(),
  deadline: deadlineSchema.optional(),
});

export const updateProjectSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema.nullable().optional(),
    status: z.enum(ProjectStatus).optional(),
    deadline: deadlineSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const listProjectsQuerySchema = z.object({
  status: z.enum(ProjectStatus).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
