// The TanStack Query cache for authKeys.me *is* the auth state — no separate
// React Context (see the plan's decision on this). An authenticated
// route-group layout reads useCurrentUser() directly: loading → skeleton,
// error (401) → redirect to /login, success → render.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "./api";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "./api";

export const authKeys = {
  me: ["auth", "me"] as const,
};

export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.getCurrentUser,
    retry: false, // 401 is an expected, meaningful result here — never retry it
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Cookie is cleared server-side — re-fetching /auth/me now correctly
      // 401s, which is what drives the route guard's redirect to /login.
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => authApi.updateProfile(input),
    onSuccess: (user) => {
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => authApi.deleteAccount(password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}
