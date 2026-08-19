"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "./api-client";

export function AppQueryProvider({ children }: { children: React.ReactNode }) {
  // useState (not a module-level singleton) so each request gets its own
  // client on the server, while the client still reuses one across renders.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              // Don't retry on 401/403/404 — retrying an auth/not-found
              // error just delays the inevitable and wastes a round trip.
              if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
                return false;
              }
              return failureCount < 2;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
