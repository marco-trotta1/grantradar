import { Request, Response, NextFunction } from "express";

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.statusCode ?? 500;
  const message =
    process.env.NODE_ENV === "production" && statusCode === 500
      ? "Internal server error"
      : err.message;

  console.error(`[${statusCode}] ${err.message}`, err.stack);
  res.status(statusCode).json({ error: message });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found" });
}
