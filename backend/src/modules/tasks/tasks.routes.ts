import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth";
import {
  listTasksHandler,
  getTaskHandler,
  createTaskHandler,
  updateTaskHandler,
  deleteTaskHandler,
  completeTaskHandler,
} from "./tasks.controller";

export const tasksRouter = Router();

tasksRouter.get("/", requireAuth, listTasksHandler);
tasksRouter.post("/", requireAuth, createTaskHandler);
tasksRouter.get("/:id", requireAuth, getTaskHandler);
tasksRouter.patch("/:id", requireAuth, updateTaskHandler);
tasksRouter.delete("/:id", requireAuth, deleteTaskHandler);
tasksRouter.post("/:id/complete", requireAuth, completeTaskHandler);
