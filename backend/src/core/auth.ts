import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError } from "./errors";
import {
  getJwtSecret,
  type AuthTokenPayload,
} from "../modules/auth/auth.service";
import type { UserRole } from "../modules/auth/auth.schema";

declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.header("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return next(
      new UnauthorizedError("Missing or invalid Authorization header"),
    );
  }

  const token = header.slice(7).trim();
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
};

export const requireRole = (role: UserRole) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (req.user.role !== role) {
      return next(new ForbiddenError(`Requires ${role} role`));
    }
    next();
  };
};
