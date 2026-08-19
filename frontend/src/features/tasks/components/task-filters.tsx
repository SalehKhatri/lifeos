"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/features/categories/hooks";
import type { TaskFilters as TaskFiltersValue } from "@/features/tasks/api";

const ALL = "__all__";

interface TaskFiltersProps {
  filters: TaskFiltersValue;
  onChange: (filters: TaskFiltersValue) => void;
}

export function TaskFilters({ filters, onChange }: TaskFiltersProps) {
  const { data: categories } = useCategories();

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        value={filters.status ?? ALL}
        onValueChange={(v) =>
          onChange({ ...filters, status: v === ALL ? undefined : (v as TaskFiltersValue["status"]) })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          <SelectItem value="TODO">To do</SelectItem>
          <SelectItem value="IN_PROGRESS">In progress</SelectItem>
          <SelectItem value="DONE">Done</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.priority ?? ALL}
        onValueChange={(v) =>
          onChange({
            ...filters,
            priority: v === ALL ? undefined : (v as TaskFiltersValue["priority"]),
          })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          <SelectItem value="LOW">Low</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="URGENT">Urgent</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.categoryId ?? ALL}
        onValueChange={(v) => onChange({ ...filters, categoryId: v && v !== ALL ? v : undefined })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {categories?.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
