import { prisma } from "../../shared/db/prisma";
import { NotFoundError, ValidationError } from "../../shared/middleware/errors";
import type {
  CreateScheduleBlockInput,
  ListScheduleBlocksQuery,
  UpdateScheduleBlockInput,
} from "./schedule.validation";

async function getOwnedBlockOrThrow(blockId: string, userId: string) {
  const block = await prisma.scheduleBlock.findUnique({ where: { id: blockId } });
  if (!block || block.userId !== userId) {
    // Someone else's block looks identical to "not found" — no reason to hint it exists.
    throw new NotFoundError("Schedule block not found");
  }
  return block;
}

export async function listScheduleBlocks(userId: string, filters: ListScheduleBlocksQuery) {
  return prisma.scheduleBlock.findMany({
    where: {
      userId,
      ...(filters.dayOfWeek !== undefined ? { dayOfWeek: filters.dayOfWeek } : {}),
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

export async function createScheduleBlock(userId: string, input: CreateScheduleBlockInput) {
  return prisma.scheduleBlock.create({
    data: {
      userId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      label: input.label,
      // Client-generated grouping tag for an overnight-spanning commitment's
      // two halves (see schema.prisma) — explicitly null when not provided
      // (exactOptionalPropertyTypes means `undefined` isn't interchangeable
      // with "omit the key" here — Prisma's generated type wants `string |
      // null` for this nullable column).
      pairId: input.pairId ?? null,
    },
  });
}

export async function updateScheduleBlock(
  blockId: string,
  userId: string,
  input: UpdateScheduleBlockInput,
) {
  const existing = await getOwnedBlockOrThrow(blockId, userId);

  const merged = {
    dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek,
    startTime: input.startTime ?? existing.startTime,
    endTime: input.endTime ?? existing.endTime,
    label: input.label ?? existing.label,
  };

  if (merged.startTime >= merged.endTime) {
    throw new ValidationError("startTime must be before endTime");
  }

  return prisma.scheduleBlock.update({
    where: { id: blockId },
    data: merged,
  });
}

export async function deleteScheduleBlock(blockId: string, userId: string) {
  await getOwnedBlockOrThrow(blockId, userId);
  await prisma.scheduleBlock.delete({ where: { id: blockId } });
}
