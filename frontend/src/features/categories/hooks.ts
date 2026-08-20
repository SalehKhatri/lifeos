import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as categoriesApi from "./api";
import type { CreateCategoryInput, UpdateCategoryInput } from "./api";
import { ApiError } from "@/lib/api-client";
import type { Category } from "@/types";

export const categoryKeys = {
  all: ["categories"] as const,
};

// Toast copy convention (see frontend/DESIGN.md): success messages are
// past-tense + the identifying name, not a generic phrase like "Category
// updated successfully".
function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useCategories() {
  return useQuery({
    queryKey: categoryKeys.all,
    queryFn: categoriesApi.listCategories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => categoriesApi.createCategory(input),
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success(`Added category "${category.name}"`);
    },
    onError: (err, input) =>
      toast.error(errorMessage(err, `Couldn't add category "${input.name}"`)),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      categoriesApi.updateCategory(id, input),
    onSuccess: (category) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success(`Updated category "${category.name}"`);
    },
    onError: (err, { input }) =>
      toast.error(errorMessage(err, `Couldn't update category${input.name ? ` "${input.name}"` : ""}`)),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (category: Category) => categoriesApi.deleteCategory(category.id),
    onSuccess: (_data, category) => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      // Tasks embed their category inline — a deleted category means any
      // task using it now comes back with categoryId: null from the API.
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Deleted category "${category.name}"`);
    },
    onError: (err, category) =>
      toast.error(errorMessage(err, `Couldn't delete category "${category.name}"`)),
  });
}
