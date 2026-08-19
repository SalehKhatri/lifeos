// Thin fetch wrapper — always calls the backend directly (never proxied
// through Next.js) with credentials so the browser attaches the httpOnly
// auth cookie. Parses the backend's uniform { data } / { error: { message,
// code } } shape and throws ApiError on failure, so TanStack Query's
// isError/error work naturally without per-call try/catch.
//
// fetch over axios (decided 2026-08-19, see docs/PROGRESS.md Decisions Log):
// no new dependency, native ReadableStream fits future streaming/AI use
// cases better than axios historically has, Next.js's fetch-specific caching
// extensions are available if ever needed, and TanStack Query's cancellation
// model is built around AbortController, which fetch consumes directly.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

type QueryValue = string | number | boolean | undefined;

// Omits undefined values so `{ status: undefined }` doesn't become "?status=undefined".
export function toQueryString(params: Record<string, QueryValue>): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string | number | boolean] => entry[1] !== undefined,
  );
  if (entries.length === 0) return "";
  const search = new URLSearchParams();
  for (const [key, value] of entries) {
    search.set(key, String(value));
  }
  return `?${search.toString()}`;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message = json?.error?.message ?? `Request failed with status ${res.status}`;
    const code = json?.error?.code ?? "UNKNOWN_ERROR";
    throw new ApiError(message, code, res.status);
  }

  return json.data as T;
}
