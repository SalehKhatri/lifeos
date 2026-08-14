import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "./errors";

// One centralized error-handling middleware, mounted last in app.ts.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { message: err.message, code: err.code } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: err.issues.map((issue) => issue.message).join(", "),
        code: "VALIDATION_ERROR",
      },
    });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { message: "Internal server error", code: "INTERNAL_ERROR" } });
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { message: "Route not found", code: "NOT_FOUND" } });
};
