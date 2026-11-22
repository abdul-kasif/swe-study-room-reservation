import request from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { app } from "../../app";
import { db } from "../../db";
import { reservations, resources } from "../../db/schema";
import { eq } from "drizzle-orm";

describe("Reservation Vertical Slice: Create Reservation", () => {
  const tomorrowAt = (hour: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  beforeEach(async () => {
    await db.delete(reservations);
    await db.delete(resources);

    await db.insert(resources).values([
      { resourceId: "Room-A", name: "Standard Room A", isActive: true },
      { resourceId: "Room-Closed", name: "Closed Room", isActive: false },
    ]);
  });

  it("should create a DRAFT reservation and return 201 Created", async () => {
    const response = await request(app)
      .post("/api/reservations")
      .send({
        resourceId: "Room-A",
        userId: "Student1",
        startTime: tomorrowAt(10),
        endTime: tomorrowAt(12),
      });

    expect(response.status).toBe(201);
    expect(response.body.state).toBe("DRAFT");
    expect(response.body.id).toBeTypeOf("number");
  });

  it("should reject booking an inactive or missing resource with 404", async () => {
    const response = await request(app)
      .post("/api/reservations")
      .send({
        resourceId: "Room-Closed",
        userId: "Student1",
        startTime: tomorrowAt(10),
        endTime: tomorrowAt(12),
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("ResourceNotFoundError");
  });

  it("should enforce the 4-hour daily quota across multiple bookings", async () => {
    // First 3-hour booking succeeds
    const first = await request(app)
      .post("/api/reservations")
      .send({
        resourceId: "Room-A",
        userId: "Student1",
        startTime: tomorrowAt(8),
        endTime: tomorrowAt(11),
      });
    expect(first.status).toBe(201);

    // Second 2-hour booking on the same day exceeds 4 hours -> 400
    const second = await request(app)
      .post("/api/reservations")
      .send({
        resourceId: "Room-A",
        userId: "Student1",
        startTime: tomorrowAt(12),
        endTime: tomorrowAt(14),
      });

    expect(second.status).toBe(400);
    expect(second.body.error).toBe("DailyQuotaExceededError");
  });

  it("should reject invalid intervals where startTime >= endTime with 422", async () => {
    const response = await request(app)
      .post("/api/reservations")
      .send({
        resourceId: "Room-A",
        userId: "Student1",
        startTime: tomorrowAt(12),
        endTime: tomorrowAt(10),
      });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe("Validation Error");
  });
});

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

describe("Reservation Vertical Slice: VIP Approval", () => {
  let pendingReservationId: number;

  beforeEach(async () => {
    await db.delete(reservations);
    await db.delete(resources);

    await db.insert(resources).values({
      resourceId: "VIP_Room-A",
      name: "VIP Room A",
      isActive: true,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const end = new Date(tomorrow);
    end.setHours(end.getHours() + 2);

    const inserted = await db
      .insert(reservations)
      .values({
        resourceId: "VIP_Room-A",
        userId: "TestUser2",
        startTime: tomorrow,
        endTime: end,
        state: "PENDING_APPROVAL",
      })
      .returning();

    pendingReservationId = inserted[0].id;
  });

  it("should approve a PENDING_APPROVAL reservation", async () => {
    const response = await request(app)
      .post(`/api/reservations/${pendingReservationId}/approval`)
      .send({ adminId: "Admin1", decision: "approve" });

    expect(response.status).toBe(200);
    expect(response.body.state).toBe("CONFIRMED");

    const dbRecord = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, pendingReservationId));
    expect(dbRecord[0].state).toBe("CONFIRMED");
  });

  it("should reject a PENDING_APPROVAL reservation and set to CANCELLED", async () => {
    const response = await request(app)
      .post(`/api/reservations/${pendingReservationId}/approval`)
      .send({ adminId: "Admin1", decision: "reject" });

    expect(response.status).toBe(200);
    expect(response.body.state).toBe("CANCELLED");
  });

  it("should block approval if start time has passed (expiry)", async () => {
    // ARRANGE: Set the start time to the past
    const past = new Date();
    past.setHours(past.getHours() - 2);
    await db
      .update(reservations)
      .set({ startTime: past })
      .where(eq(reservations.id, pendingReservationId));

    // ACT
    const response = await request(app)
      .post(`/api/reservations/${pendingReservationId}/approval`)
      .send({ adminId: "Admin1", decision: "approve" });

    // ASSERT
    expect(response.status).toBe(400);
    expect(response.body.detail).toContain("Approval expired");

    // Ensure the state actually transitioned to CANCELLED in the DB
    const dbRecord = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, pendingReservationId));
    expect(dbRecord[0].state).toBe("CANCELLED");
  });
});

describe("Reservation Vertical Slice: Cancel Reservation", () => {
  let futureReservationId: number;

  beforeEach(async () => {
    await db.delete(reservations);
    await db.delete(resources);

    await db.insert(resources).values({
      resourceId: "Room-A",
      name: "Standard Room A",
      isActive: true,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const end = new Date(tomorrow);
    end.setHours(end.getHours() + 2);

    const inserted = await db
      .insert(reservations)
      .values({
        resourceId: "Room-A",
        userId: "Student1",
        startTime: tomorrow,
        endTime: end,
        state: "CONFIRMED",
      })
      .returning();

    futureReservationId = inserted[0].id;
  });

  it("should cancel a future reservation and be idempotent on repeat calls", async () => {
    const first = await request(app)
      .post(`/api/reservations/${futureReservationId}/cancel`)
      .send();

    expect(first.status).toBe(200);
    expect(first.body).toEqual({ id: futureReservationId, state: "CANCELLED" });

    // Repeat call should also return 200 OK without error
    const repeat = await request(app)
      .post(`/api/reservations/${futureReservationId}/cancel`)
      .send();

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual({
      id: futureReservationId,
      state: "CANCELLED",
    });
  });

  it("should reject cancellation if the start time has already passed", async () => {
    const pastStart = new Date();
    pastStart.setHours(pastStart.getHours() - 2);
    const pastEnd = new Date();
    pastEnd.setHours(pastEnd.getHours() - 1);

    await db
      .update(reservations)
      .set({ startTime: pastStart, endTime: pastEnd })
      .where(eq(reservations.id, futureReservationId));

    const response = await request(app)
      .post(`/api/reservations/${futureReservationId}/cancel`)
      .send();

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("InvalidStateTransitionError");
    expect(response.body.detail).toContain("Cannot cancel");
  });

  it("should return 404 when cancelling a non-existent reservation", async () => {
    const response = await request(app)
      .post("/api/reservations/999999/cancel")
      .send();

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("ReservationNotFoundError");
  });
});

describe("Reservation Vertical Slice: Check Availability", () => {
  const tomorrowAt = (hour: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(hour, 0, 0, 0);
    return d;
  };

  beforeEach(async () => {
    await db.delete(reservations);
    await db.delete(resources);

    await db.insert(resources).values([
      { resourceId: "Room-A", name: "Standard Room A", isActive: true },
      { resourceId: "Room-Closed", name: "Closed Room", isActive: false },
    ]);
  });

  it("should return AVAILABLE when no CONFIRMED reservation overlaps", async () => {
    // Seed a DRAFT reservation — drafts should not block availability
    await db.insert(reservations).values({
      resourceId: "Room-A",
      userId: "Student1",
      startTime: tomorrowAt(10),
      endTime: tomorrowAt(12),
      state: "DRAFT",
    });

    const response = await request(app)
      .post("/api/availability")
      .send({
        resourceId: "Room-A",
        startTime: tomorrowAt(10).toISOString(),
        endTime: tomorrowAt(12).toISOString(),
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "AVAILABLE" });
  });

  it("should return UNAVAILABLE when a CONFIRMED reservation overlaps, and AVAILABLE for adjacent slots", async () => {
    await db.insert(reservations).values({
      resourceId: "Room-A",
      userId: "Student1",
      startTime: tomorrowAt(10),
      endTime: tomorrowAt(12),
      state: "CONFIRMED",
    });

    // Overlapping window (11:00 - 13:00)
    const overlap = await request(app)
      .post("/api/availability")
      .send({
        resourceId: "Room-A",
        startTime: tomorrowAt(11).toISOString(),
        endTime: tomorrowAt(13).toISOString(),
      });
    expect(overlap.status).toBe(200);
    expect(overlap.body).toEqual({ status: "UNAVAILABLE" });

    // Adjacent window (12:00 - 14:00) — half-open [start, end) does not conflict
    const adjacent = await request(app)
      .post("/api/availability")
      .send({
        resourceId: "Room-A",
        startTime: tomorrowAt(12).toISOString(),
        endTime: tomorrowAt(14).toISOString(),
      });
    expect(adjacent.status).toBe(200);
    expect(adjacent.body).toEqual({ status: "AVAILABLE" });
  });

  it("should return 404 for an inactive or missing resource", async () => {
    const response = await request(app)
      .post("/api/availability")
      .send({
        resourceId: "Room-Closed",
        startTime: tomorrowAt(10).toISOString(),
        endTime: tomorrowAt(12).toISOString(),
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("ResourceNotFoundError");
  });

  it("should return 422 when startTime >= endTime", async () => {
    const response = await request(app)
      .post("/api/availability")
      .send({
        resourceId: "Room-A",
        startTime: tomorrowAt(12).toISOString(),
        endTime: tomorrowAt(10).toISOString(),
      });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe("Validation Error");
  });
});
