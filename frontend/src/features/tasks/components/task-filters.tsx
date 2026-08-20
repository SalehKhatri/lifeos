"use client";

import type { ReactNode } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/features/categories/hooks";
import { useProjects } from "@/features/projects/hooks";
import type { TaskFilters as TaskFiltersValue } from "@/features/tasks/api";

const ALL = "__all__";

// Base UI's <Select.Value> only resolves a value to its label from items
// that have actually mounted inside the popup — i.e. after it's been opened
// at least once. Since these filters can start pre-set (or be set without
// ever opening the dropdown), we pass the `items` label map explicitly so
// the trigger always shows the label, not the raw value.
const STATUS_ITEMS = {
  [ALL]: "All statuses",
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

const PRIORITY_ITEMS = {
  [ALL]: "All priorities",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

interface TaskFiltersProps {
  filters: TaskFiltersValue;
  onChange: (filters: TaskFiltersValue) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Four separate always-visible Selects (status/priority/category/project)
// was too much at once — user feedback, right after project landed as the
// fourth. Collapsed into one "Filters" trigger with a Popover holding all
// four, stacked with labels (same FormField used in every Sheet form, for
// consistency) — the count badge on the trigger keeps "are filters
// active?" answerable at a glance without needing them all visible, which
// is the actual information that mattered, not the four controls
// themselves.
export function TaskFilters({ filters, onChange, open, onOpenChange }: TaskFiltersProps) {
  const { data: categories } = useCategories();
  const { data: projects } = useProjects();

  const activeCount = [filters.status, filters.priority, filters.categoryId, filters.projectId]
    .filter(Boolean).length;

  // `items`' labels can be any ReactNode, so the trigger can show the same
  // color dot as the popup list below, not just a plain name.
  const categoryItems: Record<string, ReactNode> = {
    [ALL]: "All categories",
    ...Object.fromEntries(
      (categories ?? []).map((c) => [
        c.id,
        <span key={c.id} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ backgroundColor: c.color ?? undefined }}
          />
          {c.name}
        </span>,
      ]),
    ),
  };

  const projectItems: Record<string, ReactNode> = {
    [ALL]: "All projects",
    ...Object.fromEntries((projects ?? []).map((p) => [p.id, p.name])),
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={<Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" />}
      >
        <Filter className="size-3.5" />
        Filters
        {activeCount > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-accent-cyan font-mono text-[10px] font-semibold text-accent-cyan-foreground">
            {activeCount}
          </span>
        )}
        <kbd className="font-mono text-xs opacity-70">f</kbd>
      </PopoverTrigger>
      <PopoverContent className="w-64 space-y-3" align="start">
        <div className="flex items-center justify-between">
          <p className="font-heading text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Filters
          </p>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => onChange({})}
              className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <FormField label="Status" htmlFor="status-filter" className="space-y-1">
          <Select
            items={STATUS_ITEMS}
            value={filters.status ?? ALL}
            onValueChange={(v) =>
              onChange({
                ...filters,
                status: v === ALL ? undefined : (v as TaskFiltersValue["status"]),
              })
            }
          >
            <SelectTrigger id="status-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="TODO">To do</SelectItem>
              <SelectItem value="IN_PROGRESS">In progress</SelectItem>
              <SelectItem value="DONE">Done</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Priority" htmlFor="priority-filter" className="space-y-1">
          <Select
            items={PRIORITY_ITEMS}
            value={filters.priority ?? ALL}
            onValueChange={(v) =>
              onChange({
                ...filters,
                priority: v === ALL ? undefined : (v as TaskFiltersValue["priority"]),
              })
            }
          >
            <SelectTrigger id="priority-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All priorities</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Category" htmlFor="category-filter" className="space-y-1">
          <Select
            items={categoryItems}
            value={filters.categoryId ?? ALL}
            onValueChange={(v) =>
              onChange({ ...filters, categoryId: v && v !== ALL ? v : undefined })
            }
          >
            <SelectTrigger id="category-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: category.color ?? undefined }}
                    />
                    {category.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Project" htmlFor="project-filter" className="space-y-1">
          <Select
            items={projectItems}
            value={filters.projectId ?? ALL}
            onValueChange={(v) =>
              onChange({ ...filters, projectId: v && v !== ALL ? v : undefined })
            }
          >
            <SelectTrigger id="project-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </PopoverContent>
    </Popover>
  );
}
