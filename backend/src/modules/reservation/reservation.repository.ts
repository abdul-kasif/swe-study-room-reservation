import { eq, and, sql, gte, lt, ne, asc, desc, gt } from "drizzle-orm";
import { db } from "../../db";
import {
  reservations,
  resources,
  type NewReservation,
  type Reservation,
  type Resource,
} from "../../db/schema";

export class ReservationRepository {
  async getById(id: number): Promise<Reservation | undefined> {
    const result = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id));
    return result[0];
  }

  async getResourceById(resourceId: string): Promise<Resource | undefined> {
    const result = await db
      .select()
      .from(resources)
      .where(eq(resources.resourceId, resourceId))
      .limit(1);
    return result[0];
  }

  async getActiveForUserOnDay(
    userId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Reservation[]> {
    return db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.userId, userId),
          gte(reservations.startTime, dayStart),
          lt(reservations.startTime, dayEnd),
          ne(reservations.state, "CANCELLED"),
        ),
      );
  }

  async hasConfirmedOverlap(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: number,
  ): Promise<boolean> {
    const conditions = [
      eq(reservations.resourceId, resourceId),
      eq(reservations.state, "CONFIRMED"),
      sql`${reservations.startTime} < ${endTime}`,
      sql`${reservations.endTime} > ${startTime}`,
    ];

    if (excludeId !== undefined) {
      conditions.push(sql`${reservations.id} != ${excludeId}`);
    }

    const result = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(and(...conditions))
      .limit(1);

    return result.length > 0;
  }

  async getActiveResources(): Promise<Resource[]> {
    return db
      .select()
      .from(resources)
      .where(eq(resources.isActive, true))
      .orderBy(asc(resources.resourceId));
  }

  async listReservations(filters: {
    userId?: string | undefined;
    state?: string | undefined;
  }): Promise<Reservation[]> {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(reservations.userId, filters.userId));
    }
    if (filters.state) {
      conditions.push(eq(reservations.state, filters.state));
    }

    const query = db.select().from(reservations);

    if (conditions.length > 0) {
      return query
        .where(and(...conditions))
        .orderBy(desc(reservations.startTime));
    }

    return query.orderBy(desc(reservations.startTime));
  }

  async create(data: NewReservation): Promise<Reservation> {
    const result = await db.insert(reservations).values(data).returning();
    return result[0];
  }

  async getConfirmedScheduleForDay(
    resourceId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<Array<{ startTime: Date; endTime: Date }>> {
    return db
      .select({
        startTime: reservations.startTime,
        endTime: reservations.endTime,
      })
      .from(reservations)
      .where(
        and(
          eq(reservations.resourceId, resourceId),
          eq(reservations.state, "CONFIRMED"),
          lt(reservations.startTime, dayEnd),
          gt(reservations.endTime, dayStart),
        ),
      )
      .orderBy(asc(reservations.startTime));
  }

  async tryTransition(
    reservationId: number,
    expectedState: string,
    newState: string,
    enforceNoOverlap: boolean,
  ): Promise<boolean> {
    const overlapGuard = enforceNoOverlap
      ? sql`AND NOT EXISTS (
          SELECT 1 FROM ${reservations} o
          WHERE o.resource_id = ${reservations.resourceId}
            AND o.state = 'CONFIRMED'
            AND o.id != ${reservations.id}
            AND o.start_time < ${reservations.endTime}
            AND o.end_time > ${reservations.startTime}
        )`
      : sql``;

    const result = await db.execute(sql`
      UPDATE ${reservations}
      SET state = ${newState}
      WHERE id = ${reservationId}
        AND state = ${expectedState}
        ${overlapGuard}
    `);

    return result.rowCount === 1;
  }

  async cleanupExpired(now: Date): Promise<number> {
    const result = await db.execute(sql`
      UPDATE ${reservations}
      SET state = 'CANCELLED'
      WHERE state IN ('DRAFT', 'PENDING_APPROVAL')
        AND start_time <= ${now}
    `);

    return result.rowCount ?? 0;
  }
}
