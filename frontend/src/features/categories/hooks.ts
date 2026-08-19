import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as categoriesApi from "./api";
import type { CreateCategoryInput, UpdateCategoryInput } from "./api";
import { ApiError } from "@/lib/api-client";

export const categoryKeys = {
  all: ["categories"] as const,
};

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success("Category created");
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to create category")),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      categoriesApi.updateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      toast.success("Category updated");
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to update category")),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoriesApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
      // Tasks embed their category inline — a deleted category means any
      // task using it now comes back with categoryId: null from the API.
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Category deleted");
    },
    onError: (err) => toast.error(errorMessage(err, "Failed to delete category")),
  });
}
