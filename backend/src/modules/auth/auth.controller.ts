import type { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { LoginBodySchema, RegisterStudentBodySchema } from "./auth.schema";

export class AuthController {
  constructor(private readonly service: AuthService) {}

  public login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = LoginBodySchema.parse(req.body);
      const result = await this.service.login(dto);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const dto = RegisterStudentBodySchema.parse(req.body);
      const result = await this.service.registerStudent(dto);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}
