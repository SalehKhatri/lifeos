import { prisma } from "../../shared/db/prisma";
import { NotFoundError } from "../../shared/middleware/errors";
import { TaskStatus } from "../../../generated/prisma/enums";
import { getUsableCategoryOrThrow } from "../categories";
import { getOwnedProjectOrThrow } from "../projects";
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "./tasks.validation";

const INCLUDE_RELATIONS = { category: true, project: true } as const;

async function getOwnedTaskOrThrow(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: INCLUDE_RELATIONS,
  });
  if (!task || task.userId !== userId) {
    // Someone else's task looks identical to "not found" — no reason to hint it exists.
    throw new NotFoundError("Task not found");
  }
  return task;
}

export async function listTasks(userId: string, filters: ListTasksQuery) {
  return prisma.task.findMany({
    where: {
      userId,
      ...(filters.status !== undefined ? { status: filters.status } : {}),
      ...(filters.priority !== undefined ? { priority: filters.priority } : {}),
      ...(filters.categoryId !== undefined ? { categoryId: filters.categoryId } : {}),
      ...(filters.projectId !== undefined ? { projectId: filters.projectId } : {}),
    },
    include: INCLUDE_RELATIONS,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTask(taskId: string, userId: string) {
  return getOwnedTaskOrThrow(taskId, userId);
}

// Shared with the Recommendations module (via index.ts): every not-yet-done
// task, with category + project included so Recommendations can filter out
// ON_HOLD/ARCHIVED projects without depending on the Projects module itself.
export async function getRecommendableTasks(userId: string) {
  return prisma.task.findMany({
    where: { userId, status: { not: TaskStatus.DONE } },
    include: INCLUDE_RELATIONS,
  });
}

export async function createTask(userId: string, input: CreateTaskInput) {
  if (input.categoryId !== undefined) {
    await getUsableCategoryOrThrow(input.categoryId, userId);
  }
  if (input.projectId !== undefined) {
    await getOwnedProjectOrThrow(input.projectId, userId);
  }

  return prisma.task.create({
    data: {
      userId,
      title: input.title,
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      estimatedDuration: input.estimatedDuration,
      ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.status === TaskStatus.DONE ? { completedAt: new Date() } : {}),
    },
    include: INCLUDE_RELATIONS,
  });
}

export async function updateTask(taskId: string, userId: string, input: UpdateTaskInput) {
  const existing = await getOwnedTaskOrThrow(taskId, userId);

  if (input.categoryId !== undefined && input.categoryId !== null) {
    await getUsableCategoryOrThrow(input.categoryId, userId);
  }
  if (input.projectId !== undefined && input.projectId !== null) {
    await getOwnedProjectOrThrow(input.projectId, userId);
  }

  // Keep completedAt in sync with status: set on transition into DONE, clear
  // on transition out of it, leave untouched otherwise.
  let completedAt = existing.completedAt;
  if (input.status !== undefined && input.status !== existing.status) {
    completedAt = input.status === TaskStatus.DONE ? new Date() : null;
  }

  return prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.estimatedDuration !== undefined
        ? { estimatedDuration: input.estimatedDuration }
        : {}),
      ...(input.deadline !== undefined ? { deadline: input.deadline } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      completedAt,
    },
    include: INCLUDE_RELATIONS,
  });
}

export async function deleteTask(taskId: string, userId: string) {
  await getOwnedTaskOrThrow(taskId, userId);
  await prisma.task.delete({ where: { id: taskId } });
}

// Idempotent: completing an already-completed task is a no-op (doesn't bump
// completedAt to "now" again).
export async function completeTask(taskId: string, userId: string) {
  const task = await getOwnedTaskOrThrow(taskId, userId);
  if (task.status === TaskStatus.DONE) {
    return task;
  }

  return prisma.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.DONE, completedAt: new Date() },
    include: INCLUDE_RELATIONS,
  });
}
