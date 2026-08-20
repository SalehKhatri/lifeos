import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as projectsApi from "./api";
import type { ProjectFilters, ProjectInput, UpdateProjectInput } from "./api";
import { ApiError } from "@/lib/api-client";
import type { Project, ProjectStatus } from "@/types";

export const projectKeys = {
  all: ["projects"] as const,
  list: (filters: ProjectFilters) => ["projects", filters] as const,
};

// Toast copy convention (see frontend/DESIGN.md): past-tense action +
// quoted identifying name, never a generic phrase.
function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => projectsApi.listProjects(filters),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) => projectsApi.createProject(input),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(`Created "${project.name}"`);
    },
    onError: (err, input) =>
      toast.error(errorMessage(err, `Couldn't create "${input.name}"`)),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      projectsApi.updateProject(id, input),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      // Tasks embed their project inline (Task.project) — a renamed
      // project's tasks would otherwise show a stale name until refetched.
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Updated "${project.name}"`);
    },
    onError: (err, { input }) =>
      toast.error(errorMessage(err, `Couldn't update "${input.name ?? "project"}"`)),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (project: Project) => projectsApi.deleteProject(project.id),
    onSuccess: (_data, project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      // Task.project has onDelete: SetNull — deleting a project un-links
      // its tasks rather than deleting them, so their cached copies are
      // now stale (still show the deleted project).
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`Deleted "${project.name}"`);
    },
    onError: (err, project) =>
      toast.error(errorMessage(err, `Couldn't delete "${project.name}"`)),
  });
}

// Status-only change, no success toast — same reasoning as Tasks'
// useSetTaskStatus: a quick status click on the card is frequent/low-stakes,
// not a deliberate form save, so the UI updating is its own feedback.
export function useSetProjectStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ project, status }: { project: Project; status: ProjectStatus }) =>
      projectsApi.updateProject(project.id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
    onError: (err, { project }) =>
      toast.error(errorMessage(err, `Couldn't update "${project.name}"`)),
  });
}
