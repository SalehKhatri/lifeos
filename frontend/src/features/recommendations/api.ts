import { apiFetch } from "@/lib/api-client";
import type { RecommendationsResponse, TodayView } from "@/types";

export async function getRecommendations(): Promise<RecommendationsResponse> {
  return apiFetch<RecommendationsResponse>("/recommendations");
}

export async function getTodayView(): Promise<TodayView> {
  return apiFetch<TodayView>("/today");
}
