import type { Request, Response } from "express";
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuerySchema,
} from "./projects.validation";
import { UnauthorizedError } from "../../shared/middleware/errors";
import { requireParam } from "../../shared/utils/params";
import * as projectsService from "./projects.service";

export async function listProjectsHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const query = listProjectsQuerySchema.parse(req.query);
  const projects = await projectsService.listProjects(req.user.id, query);
  res.status(200).json({ data: { projects } });
}

export async function getProjectHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const project = await projectsService.getProject(requireParam(req, "id"), req.user.id);
  res.status(200).json({ data: { project } });
}

export async function createProjectHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const input = createProjectSchema.parse(req.body);
  const project = await projectsService.createProject(req.user.id, input);
  res.status(201).json({ data: { project } });
}

export async function updateProjectHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const input = updateProjectSchema.parse(req.body);
  const project = await projectsService.updateProject(
    requireParam(req, "id"),
    req.user.id,
    input,
  );
  res.status(200).json({ data: { project } });
}

export async function deleteProjectHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  await projectsService.deleteProject(requireParam(req, "id"), req.user.id);
  res.status(200).json({ data: { deleted: true } });
}
