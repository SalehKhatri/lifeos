import type { Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../shared/config/env";
import { AUTH_COOKIE_NAME } from "../../shared/middleware/auth";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
};

export function setAuthCookie(res: Response, token: string) {
  // Derive the cookie's maxAge from the token's own `exp` claim so the two
  // never drift apart, instead of duplicating JWT_EXPIRES_IN as a separate value.
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const maxAge = decoded?.exp ? decoded.exp * 1000 - Date.now() : undefined;

  res.cookie(AUTH_COOKIE_NAME, token, {
    ...cookieOptions,
    ...(maxAge !== undefined ? { maxAge } : {}),
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions);
}
