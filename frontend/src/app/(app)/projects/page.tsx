"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/query-error-state";
import { ProjectFilters } from "@/features/projects/components/project-filters";
import { ProjectList } from "@/features/projects/components/project-list";
import { ProjectFormSheet } from "@/features/projects/components/project-form-sheet";
import { useProjects } from "@/features/projects/hooks";
import type { ProjectFilters as ProjectFiltersValue } from "@/features/projects/api";
import type { Project } from "@/types";

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<ProjectFiltersValue>({});
  const { data: projects, isLoading, isError, refetch } = useProjects(filters);
  // Lazy initializer, not an effect — see app/(app)/tasks/page.tsx's
  // identical pattern for why (react-hooks/set-state-in-effect).
  const [sheetOpen, setSheetOpen] = useState(() => Boolean(searchParams.get("new")));
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  useEffect(() => {
    if (searchParams.get("new")) {
      router.replace("/projects");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditingProject(null);
    setSheetOpen(true);
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setSheetOpen(true);
  }

  // "n" opens the create sheet — same page-level shortcut as /tasks, for
  // parity (frontend/DESIGN.md's "master control" principle applies
  // app-wide, not just to the page that happened to get it first).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        openCreate();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold">Projects</h1>
        <Button onClick={openCreate}>
          <Plus />
          New project
          <kbd className="ml-1 font-mono text-xs opacity-70">n</kbd>
        </Button>
      </div>

      <ProjectFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryErrorState onRetry={() => refetch()} />
      ) : (
        <ProjectList projects={projects ?? []} onEdit={openEdit} />
      )}

      <ProjectFormSheet open={sheetOpen} onOpenChange={setSheetOpen} project={editingProject} />
    </div>
  );
}
