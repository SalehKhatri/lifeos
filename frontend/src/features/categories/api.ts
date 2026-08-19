import { apiFetch } from "@/lib/api-client";
import type { Category } from "@/types";

export interface CreateCategoryInput {
  name: string;
  color?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
}

export async function listCategories(): Promise<Category[]> {
  const { categories } = await apiFetch<{ categories: Category[] }>("/categories");
  return categories;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const { category } = await apiFetch<{ category: Category }>("/categories", {
    method: "POST",
    body: input,
  });
  return category;
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  const { category } = await apiFetch<{ category: Category }>(`/categories/${id}`, {
    method: "PATCH",
    body: input,
  });
  return category;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch(`/categories/${id}`, { method: "DELETE" });
}
