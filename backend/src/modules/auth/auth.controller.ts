import type { Request, Response } from "express";
import {
  registerSchema,
  loginSchema,
  deleteAccountSchema,
  updateProfileSchema,
} from "./auth.validation";
import { setAuthCookie, clearAuthCookie } from "./auth.cookies";
import { UnauthorizedError } from "../../shared/middleware/errors";
import * as authService from "./auth.service";

export async function registerHandler(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const { user, token } = await authService.register(input);
  setAuthCookie(res, token);
  res.status(201).json({ data: { user } });
}

export async function loginHandler(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const { user, token } = await authService.login(input);
  setAuthCookie(res, token);
  res.status(200).json({ data: { user } });
}

export async function logoutHandler(_req: Request, res: Response) {
  const result = authService.logout();
  clearAuthCookie(res);
  res.status(200).json({ data: result });
}

// With an httpOnly cookie, the frontend can't read the token itself — this
// gives it a way to ask "am I logged in, and as whom?" on page load. Fetches
// fresh from the DB (not the JWT payload) since name/timezone can change
// after the token was issued.
export async function meHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const user = await authService.getProfile(req.user.id);
  res.status(200).json({ data: { user } });
}

export async function updateProfileHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const input = updateProfileSchema.parse(req.body);
  const user = await authService.updateProfile(req.user.id, input);
  res.status(200).json({ data: { user } });
}

export async function deleteAccountHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError("Not authenticated");
  }

  const input = deleteAccountSchema.parse(req.body);
  await authService.deleteAccount(req.user.id, input);
  clearAuthCookie(res);
  res.status(200).json({ data: { deleted: true } });
}
