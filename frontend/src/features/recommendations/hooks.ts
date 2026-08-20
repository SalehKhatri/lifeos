import { useQuery } from "@tanstack/react-query";
import * as recommendationsApi from "./api";

// Plain key arrays (not a keys-factory object like Tasks/Projects/Schedule)
// — these are read-only, single-shape queries with no filter variants, and
// Tasks' mutations already invalidate these exact keys directly (see
// features/tasks/hooks.ts's invalidateTaskRelated) rather than importing
// from this module, so there's no shared factory to keep in sync.
export function useRecommendations() {
  return useQuery({
    queryKey: ["recommendations"],
    queryFn: recommendationsApi.getRecommendations,
  });
}

export function useTodayView() {
  return useQuery({
    queryKey: ["today"],
    queryFn: recommendationsApi.getTodayView,
  });
}
