import { apiFetch } from "@/lib/api-client";
import type { User } from "@/types";

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  timezone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  timezone?: string;
}

export async function getCurrentUser(): Promise<User> {
  const { user } = await apiFetch<{ user: User }>("/auth/me");
  return user;
}

export async function register(input: RegisterInput): Promise<User> {
  const { user } = await apiFetch<{ user: User }>("/auth/register", {
    method: "POST",
    body: input,
  });
  return user;
}

export async function login(input: LoginInput): Promise<User> {
  const { user } = await apiFetch<{ user: User }>("/auth/login", {
    method: "POST",
    body: input,
  });
  return user;
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  const { user } = await apiFetch<{ user: User }>("/auth/me", {
    method: "PATCH",
    body: input,
  });
  return user;
}

export async function deleteAccount(password: string): Promise<void> {
  await apiFetch("/auth/me", { method: "DELETE", body: { password } });
}
