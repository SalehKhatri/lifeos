"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/features/categories/hooks";

// Compact management surface, triggered from the task form's category select
// — not a full page. Own categories only (defaults can't be renamed/deleted,
// backend rejects it) — delete is immediate here, no AlertDialog: this is a
// low-stakes, easily-recreated label, unlike deleting an actual task.
export function CategoryManager() {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#22d3ee");

  const ownCategories = categories?.filter((c) => c.userId !== null) ?? [];

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createCategory.mutate(
      { name: name.trim(), color },
      { onSuccess: () => setName("") },
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Manage categories" />
        }
      >
        <Plus />
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="font-heading text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Your categories
        </p>
        <div className="space-y-1">
          {ownCategories.length === 0 && (
            <p className="text-sm text-muted-foreground">No custom categories yet.</p>
          )}
          {ownCategories.map((category) => (
            <div key={category.id} className="flex items-center gap-2 rounded-md px-1.5 py-1">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color ?? undefined }}
              />
              <span className="flex-1 truncate text-sm">{category.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => deleteCategory.mutate(category.id)}
                aria-label={`Delete ${category.name}`}
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <Separator />
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
            aria-label="Category color"
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!name.trim() || createCategory.isPending}>
            Add
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
