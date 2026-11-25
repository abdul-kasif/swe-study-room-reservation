import request from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { app } from "../../app";
import { db } from "../../db";
import { reservations, resources } from "../../db/schema";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../auth/auth.service";

const STUDENT_TOKEN = jwt.sign(
  { sub: "Student1", fullName: "Alice Student", role: "STUDENT" },
  getJwtSecret(),
);
const ADMIN_TOKEN = jwt.sign(
  { sub: "Admin1", fullName: "Campus Admin", role: "ADMIN" },
  getJwtSecret(),
);

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
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send({
        resourceId: "Room-A",
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
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send({
        resourceId: "Room-Closed",
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
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send({
        resourceId: "Room-A",
        startTime: tomorrowAt(8),
        endTime: tomorrowAt(11),
      });
    expect(first.status).toBe(201);

    // Second 2-hour booking on the same day exceeds 4 hours -> 400
    const second = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send({
        resourceId: "Room-A",
        startTime: tomorrowAt(12),
        endTime: tomorrowAt(14),
      });

    expect(second.status).toBe(400);
    expect(second.body.error).toBe("DailyQuotaExceededError");
  });

  it("should reject invalid intervals where startTime >= endTime with 422", async () => {
    const response = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send({
        resourceId: "Room-A",
        startTime: tomorrowAt(12),
        endTime: tomorrowAt(10),
      });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe("Validation Error");
  });
});

describe("Reservation Vertical Slice: Confirmation", () => {
  let testReservationId: number;

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
        state: "DRAFT",
      })
      .returning();

    testReservationId = inserted[0].id;
  });

  afterAll(async () => {
    // Pool cleanup hook if needed
  });

  it("should confirm a DRAFT reservation and return 200 OK", async () => {
    const response = await request(app)
      .post(`/api/reservations/${testReservationId}/confirm`)
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: testReservationId,
      state: "CONFIRMED",
    });

    const dbRecord = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, testReservationId));
    expect(dbRecord[0].state).toBe("CONFIRMED");
  });

  it("should enforce domain rules: cannot confirm an already CONFIRMED reservation", async () => {
    await db
      .update(reservations)
      .set({ state: "CONFIRMED" })
      .where(eq(reservations.id, testReservationId));

    const response = await request(app)
      .post(`/api/reservations/${testReservationId}/confirm`)
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send();

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("InvalidStateTransitionError");
    expect(response.body.detail).toBe(
      "Only DRAFT reservations can be confirmed",
    );
  });

  it("should enforce parameter validation: reject invalid IDs", async () => {
    const response = await request(app)
      .post(`/api/reservations/not-a-number/confirm`)
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send();

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
        userId: "Student1",
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
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ decision: "approve" });

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
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ decision: "reject" });

    expect(response.status).toBe(200);
    expect(response.body.state).toBe("CANCELLED");
  });

  it("should block approval if start time has passed (expiry)", async () => {
    const past = new Date();
    past.setHours(past.getHours() - 2);
    await db
      .update(reservations)
      .set({ startTime: past })
      .where(eq(reservations.id, pendingReservationId));

    const response = await request(app)
      .post(`/api/reservations/${pendingReservationId}/approval`)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send({ decision: "approve" });

    expect(response.status).toBe(400);
    expect(response.body.detail).toContain("Approval expired");

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
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send();

    expect(first.status).toBe(200);
    expect(first.body).toEqual({ id: futureReservationId, state: "CANCELLED" });

    const repeat = await request(app)
      .post(`/api/reservations/${futureReservationId}/cancel`)
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
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
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send();

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("InvalidStateTransitionError");
    expect(response.body.detail).toContain("Cannot cancel");
  });

  it("should return 404 when cancelling a non-existent reservation", async () => {
    const response = await request(app)
      .post("/api/reservations/999999/cancel")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
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
    await db.insert(reservations).values({
      resourceId: "Room-A",
      userId: "Student1",
      startTime: tomorrowAt(10),
      endTime: tomorrowAt(12),
      state: "DRAFT",
    });

    const response = await request(app)
      .post("/api/availability")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
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

    const overlap = await request(app)
      .post("/api/availability")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send({
        resourceId: "Room-A",
        startTime: tomorrowAt(11).toISOString(),
        endTime: tomorrowAt(13).toISOString(),
      });
    expect(overlap.status).toBe(200);
    expect(overlap.body).toEqual({ status: "UNAVAILABLE" });

    const adjacent = await request(app)
      .post("/api/availability")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
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
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
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
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send({
        resourceId: "Room-A",
        startTime: tomorrowAt(12).toISOString(),
        endTime: tomorrowAt(10).toISOString(),
      });

    expect(response.status).toBe(422);
    expect(response.body.error).toBe("Validation Error");
  });
});

describe("Reservation Vertical Slice: Admin Auth & Expired Cleanup", () => {
  beforeEach(async () => {
    await db.delete(reservations);
    await db.delete(resources);

    await db.insert(resources).values([
      { resourceId: "Room-A", name: "Standard Room A", isActive: true },
      { resourceId: "VIP_Room-A", name: "VIP Room A", isActive: true },
    ]);
  });

  it("should reject missing/invalid tokens with 401 and non-admin tokens with 403", async () => {
    const missing = await request(app)
      .post("/api/admin/cleanup-expired")
      .send();
    expect(missing.status).toBe(401);
    expect(missing.body.error).toBe("UnauthorizedError");

    const invalid = await request(app)
      .post("/api/admin/cleanup-expired")
      .set("Authorization", "Bearer invalid-token")
      .send();
    expect(invalid.status).toBe(401);
    expect(invalid.body.error).toBe("UnauthorizedError");

    const forbidden = await request(app)
      .post("/api/admin/cleanup-expired")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`)
      .send();
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error).toBe("ForbiddenError");
  });

  it("should atomically cancel stale DRAFT and PENDING_APPROVAL bookings without touching future or CONFIRMED ones", async () => {
    const pastStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(Date.now() + 26 * 60 * 60 * 1000);

    await db.insert(reservations).values([
      {
        resourceId: "Room-A",
        userId: "U1",
        startTime: pastStart,
        endTime: pastEnd,
        state: "DRAFT",
      },
      {
        resourceId: "VIP_Room-A",
        userId: "U2",
        startTime: pastStart,
        endTime: pastEnd,
        state: "PENDING_APPROVAL",
      },
      {
        resourceId: "Room-A",
        userId: "U3",
        startTime: pastStart,
        endTime: pastEnd,
        state: "CONFIRMED",
      },
      {
        resourceId: "Room-A",
        userId: "U4",
        startTime: futureStart,
        endTime: futureEnd,
        state: "DRAFT",
      },
    ]);

    const response = await request(app)
      .post("/api/admin/cleanup-expired")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`)
      .send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ cancelledCount: 2 });

    const all = await db.select().from(reservations);
    const statesByUser = Object.fromEntries(
      all.map((r) => [r.userId, r.state]),
    );
    expect(statesByUser).toEqual({
      U1: "CANCELLED",
      U2: "CANCELLED",
      U3: "CONFIRMED",
      U4: "DRAFT",
    });
  });
});

describe("Reservation Vertical Slice: Read Endpoints", () => {
  beforeEach(async () => {
    await db.delete(reservations);
    await db.delete(resources);

    await db.insert(resources).values([
      { resourceId: "Room-A", name: "Standard Room A", isActive: true },
      { resourceId: "VIP_Room-A", name: "VIP Room A", isActive: true },
      { resourceId: "Room-Closed", name: "Closed Room", isActive: false },
    ]);

    const t1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const t2 = new Date(t1.getTime() + 2 * 60 * 60 * 1000);

    await db.insert(reservations).values([
      {
        resourceId: "Room-A",
        userId: "Student1",
        startTime: t1,
        endTime: t2,
        state: "CONFIRMED",
      },
      {
        resourceId: "VIP_Room-A",
        userId: "Student2",
        startTime: t1,
        endTime: t2,
        state: "PENDING_APPROVAL",
      },
    ]);
  });

  it("should list only active resources", async () => {
    const response = await request(app)
      .get("/api/resources")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`);

    expect(response.status).toBe(200);
    expect(response.body.resources).toHaveLength(2);
    expect(response.body.resources.map((r: any) => r.resourceId)).toEqual([
      "Room-A",
      "VIP_Room-A",
    ]);
  });

  it("should filter reservations by userId (student) and state (admin)", async () => {
    const byUser = await request(app)
      .get("/api/reservations?userId=Student1")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`);
    expect(byUser.status).toBe(200);
    expect(byUser.body.reservations).toHaveLength(1);
    expect(byUser.body.reservations[0].userId).toBe("Student1");

    const byState = await request(app)
      .get("/api/reservations?state=PENDING_APPROVAL")
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);
    expect(byState.status).toBe(200);
    expect(byState.body.reservations).toHaveLength(1);
    expect(byState.body.reservations[0].resourceId).toBe("VIP_Room-A");
  });

  it("should reject an invalid state filter with 422", async () => {
    const response = await request(app)
      .get("/api/reservations?state=UNKNOWN")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`);
    expect(response.status).toBe(422);
    expect(response.body.error).toBe("Validation Error");
  });
});

describe("Reservation Vertical Slice: Room Schedule", () => {
  beforeEach(async () => {
    await db.delete(reservations);
    await db.delete(resources);

    await db.insert(resources).values([
      { resourceId: "Room-A", name: "Standard Room A", isActive: true },
      { resourceId: "Room-Closed", name: "Closed Room", isActive: false },
    ]);

    const day = "2030-05-15";
    await db.insert(reservations).values([
      {
        resourceId: "Room-A",
        userId: "OtherStudent",
        startTime: new Date(`${day}T10:00:00.000Z`),
        endTime: new Date(`${day}T12:00:00.000Z`),
        state: "CONFIRMED",
      },
      {
        resourceId: "Room-A",
        userId: "OtherStudent",
        startTime: new Date(`${day}T14:00:00.000Z`),
        endTime: new Date(`${day}T15:00:00.000Z`),
        state: "DRAFT",
      },
    ]);
  });

  it("should return only CONFIRMED intervals without leaking userId", async () => {
    const res = await request(app)
      .get("/api/resources/Room-A/schedule?date=2030-05-15")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.bookedSlots).toHaveLength(1);
    expect(res.body.bookedSlots[0]).toEqual({
      startTime: "2030-05-15T10:00:00.000Z",
      endTime: "2030-05-15T12:00:00.000Z",
    });
    expect(res.body.bookedSlots[0]).not.toHaveProperty("userId");
  });

  it("should return 404 for an inactive or missing room and 422 for an invalid date", async () => {
    const missing = await request(app)
      .get("/api/resources/Room-Closed/schedule?date=2030-05-15")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`);
    expect(missing.status).toBe(404);

    const badDate = await request(app)
      .get("/api/resources/Room-A/schedule?date=15-05-2030")
      .set("Authorization", `Bearer ${STUDENT_TOKEN}`);
    expect(badDate.status).toBe(422);
  });
});
