import type { Request, Response } from "express";
import { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from "./tasks.validation";
import { UnauthorizedError } from "../../shared/middleware/errors";
import { requireParam } from "../../shared/utils/params";
import * as tasksService from "./tasks.service";

export async function listTasksHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const query = listTasksQuerySchema.parse(req.query);
  const tasks = await tasksService.listTasks(req.user.id, query);
  res.status(200).json({ data: { tasks } });
}

export async function getTaskHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const task = await tasksService.getTask(requireParam(req, "id"), req.user.id);
  res.status(200).json({ data: { task } });
}

export async function createTaskHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const input = createTaskSchema.parse(req.body);
  const task = await tasksService.createTask(req.user.id, input);
  res.status(201).json({ data: { task } });
}

export async function updateTaskHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const input = updateTaskSchema.parse(req.body);
  const task = await tasksService.updateTask(requireParam(req, "id"), req.user.id, input);
  res.status(200).json({ data: { task } });
}

export async function deleteTaskHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  await tasksService.deleteTask(requireParam(req, "id"), req.user.id);
  res.status(200).json({ data: { deleted: true } });
}

export async function completeTaskHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const task = await tasksService.completeTask(requireParam(req, "id"), req.user.id);
  res.status(200).json({ data: { task } });
}
