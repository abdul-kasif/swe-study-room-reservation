import { z } from "zod";

export const RoleSchema = z.enum(["STUDENT", "ADMIN"]);
export type UserRole = z.infer<typeof RoleSchema>;

export const LoginBodySchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  expectedRole: RoleSchema,
});

export const RegisterStudentBodySchema = z.object({
  username: z.string().trim().min(3, "Username must be at least 3 characters"),
  fullName: z.string().trim().min(2, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;
export type RegisterStudentBody = z.infer<typeof RegisterStudentBodySchema>;
