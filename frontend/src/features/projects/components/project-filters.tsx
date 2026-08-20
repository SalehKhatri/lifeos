"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectFilters as ProjectFiltersValue } from "@/features/projects/api";

const ALL = "__all__";

// Base UI's <Select.Value> needs an explicit items label map to resolve a
// pre-set value without the popup having been opened first — see
// frontend/DESIGN.md's Select.Value gotcha (hit and fixed on the Tasks
// filters first).
const STATUS_ITEMS = {
  [ALL]: "All statuses",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

interface ProjectFiltersProps {
  filters: ProjectFiltersValue;
  onChange: (filters: ProjectFiltersValue) => void;
}

export function ProjectFilters({ filters, onChange }: ProjectFiltersProps) {
  return (
    <Select
      items={STATUS_ITEMS}
      value={filters.status ?? ALL}
      onValueChange={(v) =>
        onChange({ status: v === ALL ? undefined : (v as ProjectFiltersValue["status"]) })
      }
    >
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All statuses</SelectItem>
        <SelectItem value="ACTIVE">Active</SelectItem>
        <SelectItem value="ON_HOLD">On hold</SelectItem>
        <SelectItem value="COMPLETED">Completed</SelectItem>
        <SelectItem value="ARCHIVED">Archived</SelectItem>
      </SelectContent>
    </Select>
  );
}
