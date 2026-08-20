import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth";
import { loginRateLimiter, registerRateLimiter } from "../../shared/middleware/rateLimit";
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  updateProfileHandler,
  deleteAccountHandler,
} from "./auth.controller";

export const authRouter = Router();

// The only two routes reachable without already being authenticated —
// see shared/middleware/rateLimit.ts for why these two specifically.
authRouter.post("/register", registerRateLimiter, registerHandler);
authRouter.post("/login", loginRateLimiter, loginHandler);
authRouter.post("/logout", logoutHandler);
authRouter.get("/me", requireAuth, meHandler);
authRouter.patch("/me", requireAuth, updateProfileHandler);
authRouter.delete("/me", requireAuth, deleteAccountHandler);
