import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "./errors";

export const requireAdminAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const expectedToken = process.env.ADMIN_TOKEN;
  const providedToken = req.header("x-admin-token");

  // Fail closed if ADMIN_TOKEN is not configured or does not match
  if (!expectedToken || providedToken !== expectedToken) {
    return next(new UnauthorizedError());
  }

  next();
};
