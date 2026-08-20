"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/features/categories/hooks";
import { randomCategoryColor } from "@/lib/colors";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import type { Category } from "@/types";

// Compact management surface, triggered from the task form's category select
// — not a full page. Own categories only (defaults can't be renamed/deleted,
// backend rejects it) — delete is immediate here, no AlertDialog: this is a
// low-stakes, easily-recreated label, unlike deleting an actual task.
export function CategoryManager() {
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [name, setName] = useState("");
  // Randomly seeded, not a hardcoded default — most people don't want to
  // think about a color for a quick category, but a flat default looks
  // unfinished repeated across several. Picked from a theme-fitting
  // hue/saturation/lightness band (see lib/colors.ts), not raw random RGB.
  const [color, setColor] = useState(randomCategoryColor);

  // Rename is inline, one row at a time — only the name needs an explicit
  // save step (Enter/Check or Escape/X to cancel); color is a native
  // <input type="color">, which already has its own "commit" gesture
  // (closing the picker), so it saves immediately on change instead of
  // waiting on the same edit-mode toggle as the name.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const ownCategories = categories?.filter((c) => c.userId !== null) ?? [];

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
  }

  function commitEdit(category: Category) {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === category.name) {
      setEditingId(null);
      return;
    }
    updateCategory.mutate(
      { id: category.id, input: { name: trimmed } },
      { onSuccess: () => setEditingId(null) },
    );
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createCategory.mutate(
      { name: name.trim(), color },
      {
        onSuccess: () => {
          setName("");
          // Re-roll so the next category isn't silently stuck on whatever
          // was just used.
          setColor(randomCategoryColor());
        },
      },
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
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-1"
        >
          {/* Same enter/exit convention as every other list in the app
              (lib/motion.ts's fadeInUp + AnimatePresence's popLayout) —
              this row was previously the one place a category could
              appear/disappear (create/delete) with zero motion at all. */}
          <AnimatePresence mode="popLayout">
            {ownCategories.length === 0 ? (
              <motion.p
                key="empty"
                variants={fadeInUp}
                exit="exit"
                className="text-sm text-muted-foreground"
              >
                No custom categories yet.
              </motion.p>
            ) : (
              ownCategories.map((category) => {
                const isEditing = editingId === category.id;
                return (
                  <motion.div key={category.id} layout variants={fadeInUp} exit="exit">
                    <div
                      // Hover feedback added here — unlike a read-only
                      // category badge elsewhere in the app, this row is
                      // genuinely interactive (rename/delete live right on
                      // it), so a hover cue is reinforcing a real
                      // affordance, not decorating a non-control.
                      className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/40"
                    >
                      {/* Native color input, not a plain dot — swaps color
                          and saves immediately on change (the picker
                          closing is already its own "commit" gesture, no
                          separate save step needed like the name below). */}
                      <input
                        type="color"
                        value={category.color ?? "#888888"}
                        onChange={(e) =>
                          updateCategory.mutate({
                            id: category.id,
                            input: { color: e.target.value },
                          })
                        }
                        className="size-5 shrink-0 cursor-pointer rounded-full border border-input bg-transparent p-0"
                        aria-label={`Change color for ${category.name}`}
                      />

                      {isEditing ? (
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(category);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className="h-7 flex-1"
                        />
                      ) : (
                        <span className="flex-1 truncate text-sm">{category.name}</span>
                      )}

                      {isEditing ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => commitEdit(category)}
                            aria-label={`Save ${category.name}`}
                          >
                            <Check />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setEditingId(null)}
                            aria-label="Cancel"
                          >
                            <X />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => startEdit(category)}
                            aria-label={`Rename ${category.name}`}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => deleteCategory.mutate(category)}
                            aria-label={`Delete ${category.name}`}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </motion.div>
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
