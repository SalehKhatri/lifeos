import type { Request } from "express";

// Express types req.params[name] as `string | string[] | undefined` (arrays
// are only possible for wildcard/regex-group routes, which none of ours use;
// noUncheckedIndexedAccess adds the `| undefined`). Either case here means
// the route pattern didn't declare a plain `:name` param — a programmer
// error, not a client error — so this throws a plain Error (→ 500 via the
// centralized handler) rather than a typed AppError.
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string") {
    throw new Error(`Route parameter "${name}" was not provided — check the route definition`);
  }
  return value;
}
