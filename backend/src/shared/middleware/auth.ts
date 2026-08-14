import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "./errors";

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

// Lives here (not in modules/auth) so both the middleware and the auth module
// read/write the same cookie name without the auth module importing from a
// shared file that also depends on it — shared/ stays the foundation modules build on.
export const AUTH_COOKIE_NAME = "token";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
    }
  }
}

// Protects a route: requires a valid auth cookie (httpOnly, set by the auth
// module on login/register — see modules/auth/auth.cookies.ts), attaches
// `req.user`. Any module can use this on its routes.
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token) {
    throw new UnauthorizedError("Not authenticated");
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    throw new UnauthorizedError("Invalid or expired token");
  }
};
