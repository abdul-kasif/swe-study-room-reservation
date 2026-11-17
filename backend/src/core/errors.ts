import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class DomainError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(message: string = "Invalid state transition") {
    super(message, 400);
  }
}

export class ReservationConflictError extends DomainError {
  constructor(message: string = "Reservation conflict") {
    super(message, 409);
  }
}

export class ReservationNotFoundError extends DomainError {
  constructor(message: string = "Reservation not found") {
    super(message, 404);
  }
}

// Centralized Express Error Handler
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (err instanceof DomainError) {
    res.status(err.statusCode).json({ error: err.name, detail: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({ error: "Validation Error", detail: err.issues });
    return;
  }

  console.error("[Unhandled Error]:", err);
  res
    .status(500)
    .json({ error: "InternalServerError", detail: "Internal server error" });
};
