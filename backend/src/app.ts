import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./modules/auth";
import { errorHandler, notFoundHandler } from "./shared/middleware/errorHandler";
import { env } from "./shared/config/env";

export function createApp() {
  const app = express();

  // credentials: true + a specific origin (not "*") are both required for the
  // browser to send/receive the httpOnly auth cookie cross-origin.
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.status(200).json({ data: { status: "ok" } });
  });

  app.use("/auth", authRouter);

  // Must be last: 404 catch-all, then the centralized error handler.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
