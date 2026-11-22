import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  ForbiddenError,
  UnauthorizedError,
  UserAlreadyExistsError,
} from "../../core/errors";
import { AuthRepository } from "./auth.repository";
import type { LoginBody, RegisterStudentBody, UserRole } from "./auth.schema";

export interface AuthTokenPayload {
  sub: string; // username
  fullName: string;
  role: UserRole;
}

export interface AuthResult {
  token: string;
  user: {
    username: string;
    fullName: string;
    role: UserRole;
  };
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "dev-jwt-secret-change-in-prod";
}

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  private signToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: "8h" });
  }

  async login(dto: LoginBody): Promise<AuthResult> {
    const user = await this.repository.findByUsername(dto.username);
    if (!user) {
      throw new UnauthorizedError("Invalid username or password");
    }

    const validPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedError("Invalid username or password");
    }

    if (user.role !== dto.expectedRole) {
      throw new ForbiddenError(
        `Account is registered as ${user.role}, not ${dto.expectedRole}. Please use the correct login tab.`,
      );
    }

    const role = user.role as UserRole;
    const token = this.signToken({
      sub: user.username,
      fullName: user.fullName,
      role,
    });

    return {
      token,
      user: {
        username: user.username,
        fullName: user.fullName,
        role,
      },
    };
  }

  async registerStudent(dto: RegisterStudentBody): Promise<AuthResult> {
    const existing = await this.repository.findByUsername(dto.username);
    if (existing) {
      throw new UserAlreadyExistsError(
        `Username '${dto.username}' is already taken`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.repository.createUser({
      username: dto.username,
      fullName: dto.fullName,
      passwordHash,
      role: "STUDENT",
    });

    const token = this.signToken({
      sub: created.username,
      fullName: created.fullName,
      role: "STUDENT",
    });

    return {
      token,
      user: {
        username: created.username,
        fullName: created.fullName,
        role: "STUDENT",
      },
    };
  }
}
