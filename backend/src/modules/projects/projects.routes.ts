import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth";
import {
  listProjectsHandler,
  getProjectHandler,
  createProjectHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from "./projects.controller";

export const projectsRouter = Router();

projectsRouter.get("/", requireAuth, listProjectsHandler);
projectsRouter.post("/", requireAuth, createProjectHandler);
projectsRouter.get("/:id", requireAuth, getProjectHandler);
projectsRouter.patch("/:id", requireAuth, updateProjectHandler);
projectsRouter.delete("/:id", requireAuth, deleteProjectHandler);
