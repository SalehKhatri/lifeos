import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth";
import { getTodayHandler } from "./today.controller";

export const todayRouter = Router();

todayRouter.get("/", requireAuth, getTodayHandler);
