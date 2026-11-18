import request from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { app } from "../../app";
import { db } from "../../db";
import { reservations, resources } from "../../db/schema";
import { eq } from "drizzle-orm";

describe("Reservation Vertical Slice: Confirmation", () => {
  let testReservationId: number;

  // Runs before every single test to ensure a clean, reproducible state
  beforeEach(async () => {
    // 1. Clean up existing data
    await db.delete(reservations);
    await db.delete(resources);

    // 2. Seed a standard room
    await db.insert(resources).values({
      resourceId: "Room-A",
      name: "Standard Room A",
      isActive: true,
    });

    // 3. Seed a DRAFT reservation for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const end = new Date(tomorrow);
    end.setHours(end.getHours() + 2);

    const inserted = await db
      .insert(reservations)
      .values({
        resourceId: "Room-A",
        userId: "TestUser1",
        startTime: tomorrow,
        endTime: end,
        state: "DRAFT",
      })
      .returning();

    testReservationId = inserted[0].id;
  });

  // Clean up the database connection after all tests finish
  afterAll(async () => {
    // Note: In a real setup, you'd close the pg Pool here to let the test exit cleanly.
    // For example: await pool.end(); if you export the pool from src/db/index.ts
  });

  it("should confirm a DRAFT reservation and return 200 OK", async () => {
    // ACT: Hit the API layer
    const response = await request(app)
      .post(`/api/reservations/${testReservationId}/confirm`)
      .send();

    // ASSERT: Check the HTTP boundary (Controller/Zod)
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: testReservationId,
      state: "CONFIRMED",
    });

    // ASSERT: Check the Data Layer (Database state)
    const dbRecord = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, testReservationId));
    expect(dbRecord[0].state).toBe("CONFIRMED");
  });

  it("should enforce domain rules: cannot confirm an already CONFIRMED reservation", async () => {
    // ARRANGE: Manually confirm it first
    await db
      .update(reservations)
      .set({ state: "CONFIRMED" })
      .where(eq(reservations.id, testReservationId));

    // ACT: Try to confirm it again
    const response = await request(app)
      .post(`/api/reservations/${testReservationId}/confirm`)
      .send();

    // ASSERT: Should hit the InvalidStateTransitionError in the Domain layer
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("InvalidStateTransitionError");
    expect(response.body.detail).toBe(
      "Only DRAFT reservations can be confirmed",
    );
  });

  it("should enforce parameter validation: reject invalid IDs", async () => {
    // ACT: Pass a string instead of a number
    const response = await request(app)
      .post(`/api/reservations/not-a-number/confirm`)
      .send();

    // ASSERT: Should be caught by the Zod Schema before hitting the Service layer
    expect(response.status).toBe(422);
    expect(response.body.error).toBe("Validation Error");
  });
});
