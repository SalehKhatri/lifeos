import type { Request, Response } from "express";
import {
  createScheduleBlockSchema,
  updateScheduleBlockSchema,
  listScheduleBlocksQuerySchema,
} from "./schedule.validation";
import { UnauthorizedError } from "../../shared/middleware/errors";
import { requireParam } from "../../shared/utils/params";
import * as scheduleService from "./schedule.service";

export async function listScheduleBlocksHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const query = listScheduleBlocksQuerySchema.parse(req.query);
  const scheduleBlocks = await scheduleService.listScheduleBlocks(req.user.id, query);
  res.status(200).json({ data: { scheduleBlocks } });
}

export async function createScheduleBlockHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const input = createScheduleBlockSchema.parse(req.body);
  const scheduleBlock = await scheduleService.createScheduleBlock(req.user.id, input);
  res.status(201).json({ data: { scheduleBlock } });
}

export async function updateScheduleBlockHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const input = updateScheduleBlockSchema.parse(req.body);
  const scheduleBlock = await scheduleService.updateScheduleBlock(
    requireParam(req, "id"),
    req.user.id,
    input,
  );
  res.status(200).json({ data: { scheduleBlock } });
}

export async function deleteScheduleBlockHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  await scheduleService.deleteScheduleBlock(requireParam(req, "id"), req.user.id);
  res.status(200).json({ data: { deleted: true } });
}
