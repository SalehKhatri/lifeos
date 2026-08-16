import { z } from "zod";

const nameSchema = z.string().trim().min(1, "Name cannot be empty").max(50);
const colorSchema = z
  .string()
  .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Color must be a hex code, e.g. #4F46E5");

export const createCategorySchema = z.object({
  name: nameSchema,
  color: colorSchema.optional(),
});

export const updateCategorySchema = z
  .object({
    name: nameSchema.optional(),
    color: colorSchema.optional(),
  })
  .refine((data) => data.name !== undefined || data.color !== undefined, {
    message: "Provide at least one of: name, color",
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
