import type { Request, Response } from "express";
import { UnauthorizedError } from "../../shared/middleware/errors";
import * as recommendationsService from "./recommendations.service";

export async function getRecommendationsHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const { tasks, availableMinutesToday } = await recommendationsService.getRankedRecommendations(
    req.user.id,
  );
  res.status(200).json({ data: { tasks, availableMinutesToday } });
}
