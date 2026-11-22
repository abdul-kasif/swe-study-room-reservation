import request from "supertest";
import bcrypt from "bcryptjs";
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../../app";
import { db } from "../../db";
import { users } from "../../db/schema";

describe("Auth Vertical Slice: Login & Registration", () => {
  beforeEach(async () => {
    await db.delete(users);

    const studentHash = await bcrypt.hash("student123", 10);
    const adminHash = await bcrypt.hash("admin123", 10);

    await db.insert(users).values([
      {
        username: "student1",
        fullName: "Alice",
        passwordHash: studentHash,
        role: "STUDENT",
      },
      {
        username: "admin1",
        fullName: "Admin",
        passwordHash: adminHash,
        role: "ADMIN",
      },
    ]);
  });

  it("should log in a student via the STUDENT role and return a JWT", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: "student1",
      password: "student123",
      expectedRole: "STUDENT",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user).toEqual({
      username: "student1",
      fullName: "Alice",
      role: "STUDENT",
    });
  });

  it("should block a student from logging into the ADMIN portal with 403", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: "student1",
      password: "student123",
      expectedRole: "ADMIN",
    });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("ForbiddenError");
  });

  it("should reject wrong passwords with 401", async () => {
    const res = await request(app).post("/api/auth/login").send({
      username: "admin1",
      password: "wrongpassword",
      expectedRole: "ADMIN",
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UnauthorizedError");
  });

  it("should allow new students to register and prevent duplicate usernames", async () => {
    const first = await request(app).post("/api/auth/register").send({
      username: "newstudent",
      fullName: "New Student",
      password: "password123",
    });
    expect(first.status).toBe(201);
    expect(first.body.user.role).toBe("STUDENT");

    const dup = await request(app).post("/api/auth/register").send({
      username: "newstudent",
      fullName: "Duplicate",
      password: "password123",
    });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe("UserAlreadyExistsError");
  });
});
