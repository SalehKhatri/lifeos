import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth";
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  updateProfileHandler,
  deleteAccountHandler,
} from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", registerHandler);
authRouter.post("/login", loginHandler);
authRouter.post("/logout", logoutHandler);
authRouter.get("/me", requireAuth, meHandler);
authRouter.patch("/me", requireAuth, updateProfileHandler);
authRouter.delete("/me", requireAuth, deleteAccountHandler);
