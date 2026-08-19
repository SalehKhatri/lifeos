// Hand-written to mirror the backend's response shapes exactly (see
// backend/src/modules/*). No shared codegen between the two services per
// docs/ARCHITECTURE.md ("no monorepo tooling") — keep these in sync by hand
// when a backend response shape changes.

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProjectStatus = "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

export interface User {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
}

export interface Category {
  id: string;
  userId: string | null; // null = shared default, not owned by any user
  name: string;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed at query time by the backend, never stored.
  progress: number;
  taskCount: number;
  completedTaskCount: number;
}

export interface Task {
  id: string;
  userId: string;
  projectId: string | null;
  categoryId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  estimatedDuration: number; // minutes
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  category: Category | null;
  project: Project | null;
}

export interface ScheduleBlock {
  id: string;
  userId: string;
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
  startTime: number; // minutes since midnight
  endTime: number; // minutes since midnight
  label: string;
  createdAt: string;
  updatedAt: string;
}

// Task + the Prioritization Engine's scoring output — see MVP_SPEC.md §5.
export interface RecommendedTask extends Task {
  score: number;
  reason: string;
}

export interface RecommendationsResponse {
  tasks: RecommendedTask[];
  availableMinutesToday: number;
}

export interface TodayView {
  topTask: RecommendedTask | null;
  upNext: RecommendedTask[];
  commitments: ScheduleBlock[];
}
