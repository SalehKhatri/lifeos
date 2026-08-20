import { useEffect, useState } from "react";
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

// A shared clock for the Today page — ticks every 30s (not derived once
// per render) so "ends in 12m"-style figures and which commitment even
// counts as "current" stay right without a manual refresh; this page is
// meant to be glanced at throughout the day, not just loaded once each
// morning. Lives here (one instance, owned by the page) rather than as a
// local hook duplicated inside each component that needs it, so there's
// one 30s interval driving the whole page instead of several independently
// drifting ones.
export function useNowMinutes(): number {
  const [minutes, setMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setMinutes(now.getHours() * 60 + now.getMinutes());
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return minutes;
}
