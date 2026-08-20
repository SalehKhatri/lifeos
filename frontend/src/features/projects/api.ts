import { apiFetch, toQueryString } from "@/lib/api-client";
import type { Project, ProjectStatus } from "@/types";

export interface ProjectFilters {
  status?: ProjectStatus;
}

export interface ProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  deadline?: string; // ISO datetime — backend coerces via z.coerce.date()
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  deadline?: string | null;
}

export async function listProjects(filters: ProjectFilters = {}): Promise<Project[]> {
  const { projects } = await apiFetch<{ projects: Project[] }>(
    `/projects${toQueryString(filters)}`,
  );
  return projects;
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const { project } = await apiFetch<{ project: Project }>("/projects", {
    method: "POST",
    body: input,
  });
  return project;
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  const { project } = await apiFetch<{ project: Project }>(`/projects/${id}`, {
    method: "PATCH",
    body: input,
  });
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch(`/projects/${id}`, { method: "DELETE" });
}
