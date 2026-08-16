import type { Request, Response } from "express";
import { createCategorySchema, updateCategorySchema } from "./categories.validation";
import { UnauthorizedError } from "../../shared/middleware/errors";
import { requireParam } from "../../shared/utils/params";
import * as categoriesService from "./categories.service";

export async function listCategoriesHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const categories = await categoriesService.listCategories(req.user.id);
  res.status(200).json({ data: { categories } });
}

export async function createCategoryHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const input = createCategorySchema.parse(req.body);
  const category = await categoriesService.createCategory(req.user.id, input);
  res.status(201).json({ data: { category } });
}

export async function updateCategoryHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const input = updateCategorySchema.parse(req.body);
  const category = await categoriesService.updateCategory(
    requireParam(req, "id"),
    req.user.id,
    input,
  );
  res.status(200).json({ data: { category } });
}

export async function deleteCategoryHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  await categoriesService.deleteCategory(requireParam(req, "id"), req.user.id);
  res.status(200).json({ data: { deleted: true } });
}
