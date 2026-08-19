import type { Request, Response } from "express";
import { UnauthorizedError } from "../../shared/middleware/errors";
import * as todayService from "./today.service";

export async function getTodayHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const view = await todayService.getTodayView(req.user.id);
  res.status(200).json({ data: view });
}
