"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QueryErrorStateProps {
  message?: string;
  onRetry: () => void;
}

// Shared across every data-fetching page (Tasks/Projects/Schedule/Today) —
// a failed fetch was previously indistinguishable from a genuinely empty
// result (isLoading just goes false, data stays undefined, and every
// page's own empty-state copy — "No tasks match these filters," "Fully
// free," "You're all caught up" — would render as if that were actually
// true). This is the one thing that should show up instead whenever a
// query's own `isError` is true, checked before falling through to that
// page's empty-state branch.
export function QueryErrorState({
  message = "Couldn't load this — check your connection and try again.",
  onRetry,
}: QueryErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-destructive/30 py-16 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw />
        Try again
      </Button>
    </div>
  );
}
