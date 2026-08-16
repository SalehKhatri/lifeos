import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth";
import {
  listScheduleBlocksHandler,
  createScheduleBlockHandler,
  updateScheduleBlockHandler,
  deleteScheduleBlockHandler,
} from "./schedule.controller";

export const scheduleRouter = Router();

scheduleRouter.get("/", requireAuth, listScheduleBlocksHandler);
scheduleRouter.post("/", requireAuth, createScheduleBlockHandler);
scheduleRouter.patch("/:id", requireAuth, updateScheduleBlockHandler);
scheduleRouter.delete("/:id", requireAuth, deleteScheduleBlockHandler);
