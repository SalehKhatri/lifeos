import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth";
import {
  listCategoriesHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "./categories.controller";

export const categoriesRouter = Router();

categoriesRouter.get("/", requireAuth, listCategoriesHandler);
categoriesRouter.post("/", requireAuth, createCategoryHandler);
categoriesRouter.patch("/:id", requireAuth, updateCategoryHandler);
categoriesRouter.delete("/:id", requireAuth, deleteCategoryHandler);
