import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth";
import { getRecommendationsHandler } from "./recommendations.controller";

export const recommendationsRouter = Router();

recommendationsRouter.get("/", requireAuth, getRecommendationsHandler);
