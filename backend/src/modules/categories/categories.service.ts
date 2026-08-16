import { prisma } from "../../shared/db/prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "../../shared/middleware/errors";
import type { CreateCategoryInput, UpdateCategoryInput } from "./categories.validation";

// Visible to a user = the shared defaults (userId null) plus their own.
function visibleToUser(userId: string) {
  return { OR: [{ userId: null }, { userId }] };
}

export async function listCategories(userId: string) {
  return prisma.category.findMany({
    where: visibleToUser(userId),
    orderBy: { name: "asc" },
  });
}

async function assertNameAvailable(userId: string, name: string, excludeId?: string) {
  const conflict = await prisma.category.findFirst({
    where: {
      ...visibleToUser(userId),
      name: { equals: name, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  if (conflict) {
    throw new ConflictError(`A category named "${name}" already exists`);
  }
}

export async function createCategory(userId: string, input: CreateCategoryInput) {
  await assertNameAvailable(userId, input.name);

  return prisma.category.create({
    data: {
      userId,
      name: input.name,
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });
}

// Shared with the Tasks module (via index.ts) to validate a categoryId on
// task create/update — a category is usable if it's a default or owned by
// this user.
export async function getUsableCategoryOrThrow(categoryId: string, userId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, ...visibleToUser(userId) },
  });
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  return category;
}

async function getOwnCategoryOrThrow(categoryId: string, userId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });

  if (!category) {
    throw new NotFoundError("Category not found");
  }
  if (category.userId === null) {
    throw new ForbiddenError("Default categories can't be modified");
  }
  if (category.userId !== userId) {
    // Someone else's private category — looks identical to "not found",
    // no reason to hint that a private ID exists.
    throw new NotFoundError("Category not found");
  }

  return category;
}

export async function updateCategory(
  categoryId: string,
  userId: string,
  input: UpdateCategoryInput,
) {
  await getOwnCategoryOrThrow(categoryId, userId);

  if (input.name !== undefined) {
    await assertNameAvailable(userId, input.name, categoryId);
  }

  return prisma.category.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });
}

// Deleting a category leaves its tasks in place, just uncategorized —
// Task.category has onDelete: SetNull.
export async function deleteCategory(categoryId: string, userId: string) {
  await getOwnCategoryOrThrow(categoryId, userId);
  await prisma.category.delete({ where: { id: categoryId } });
}
