import { prisma } from "../../shared/db/prisma";
import { NotFoundError } from "../../shared/middleware/errors";
import { TaskStatus } from "../../../generated/prisma/enums";
import type {
  CreateProjectInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from "./projects.validation";

type ProjectRow = { id: string };

// Progress = % of associated tasks completed, computed at query time (never
// stored — see MVP_SPEC.md). One groupBy for however many projects, not a
// query per project (see CLAUDE.md: never query in a loop).
//
// DELIBERATE, FLAGGED EXCEPTION to ARCHITECTURE.md's "never touch another
// module's Prisma models directly": this queries the Task table directly
// instead of going through modules/tasks' index.ts. Tasks already depends on
// Projects (index.ts) to validate a task's projectId on create/update —
// having Projects depend on Tasks too, for this, would create a real
// circular module dependency, which is the more strictly forbidden thing.
// User-approved 2026-08-16, see docs/PROGRESS.md Decisions Log. If a third
// module ever needs the same cross-read, promote this into a proper
// aggregator (e.g. recommendations-style) instead of adding another one-off.
async function attachProgress<T extends ProjectRow>(userId: string, projects: T[]) {
  if (projects.length === 0) {
    return [];
  }

  const projectIds = projects.map((p) => p.id);
  const grouped = await prisma.task.groupBy({
    by: ["projectId", "status"],
    where: { userId, projectId: { in: projectIds } },
    _count: { _all: true },
  });

  const counts = new Map<string, { total: number; completed: number }>();
  for (const row of grouped) {
    if (!row.projectId) continue;
    const entry = counts.get(row.projectId) ?? { total: 0, completed: 0 };
    entry.total += row._count._all;
    if (row.status === TaskStatus.DONE) {
      entry.completed += row._count._all;
    }
    counts.set(row.projectId, entry);
  }

  return projects.map((project) => {
    const c = counts.get(project.id) ?? { total: 0, completed: 0 };
    const progress = c.total === 0 ? 0 : Math.round((c.completed / c.total) * 100);
    return { ...project, progress, taskCount: c.total, completedTaskCount: c.completed };
  });
}

export async function listProjects(userId: string, filters: ListProjectsQuery) {
  const projects = await prisma.project.findMany({
    where: {
      userId,
      ...(filters.status !== undefined ? { status: filters.status } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
  return attachProgress(userId, projects);
}

// Exported too — shared with the Tasks module (via index.ts) to validate a
// projectId on task create/update, mirroring categories.service.ts's
// getUsableCategoryOrThrow.
export async function getOwnedProjectOrThrow(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== userId) {
    // Someone else's project looks identical to "not found" — no reason to hint it exists.
    throw new NotFoundError("Project not found");
  }
  return project;
}

export async function getProject(projectId: string, userId: string) {
  const project = await getOwnedProjectOrThrow(projectId, userId);
  const [withProgress] = await attachProgress(userId, [project]);
  return withProgress;
}

export async function createProject(userId: string, input: CreateProjectInput) {
  const project = await prisma.project.create({
    data: {
      userId,
      name: input.name,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
    },
  });
  // Brand new project, no tasks yet — skip the round trip, progress is always 0.
  return { ...project, progress: 0, taskCount: 0, completedTaskCount: 0 };
}

export async function updateProject(
  projectId: string,
  userId: string,
  input: UpdateProjectInput,
) {
  await getOwnedProjectOrThrow(projectId, userId);

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
    },
  });
  const [withProgress] = await attachProgress(userId, [project]);
  return withProgress;
}

// Deleting a project leaves its tasks in place, just unlinked —
// Task.project has onDelete: SetNull.
export async function deleteProject(projectId: string, userId: string) {
  await getOwnedProjectOrThrow(projectId, userId);
  await prisma.project.delete({ where: { id: projectId } });
}
