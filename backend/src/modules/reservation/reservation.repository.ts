import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  reservations,
  type Reservation,
  type NewReservation,
} from "./db/schema";

export class ReservationRepository {
  async getById(id: number): Promise<Reservation | undefined> {
    const result = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id));
    return result[0];
  }

  async create(data: NewReservation): Promise<Reservation> {
    const result = await db.insert(reservations).values(data).returning();
    return result[0];
  }

  async hasConfirmedOverlap(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: number,
  ): Promise<boolean> {
    let query = db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.resourceId, resourceId),
          eq(reservations.state, "CONFIRMED"),
          sql`${reservations.startTime} < ${endTime}`,
          sql`${reservations.endTime} > ${startTime}`,
        ),
      );

    if (excludeId !== undefined) {
      query = query.where(sql`${reservations.id} != ${excludeId}`);
    }

    const result = await query.limit(1);
    return result.length > 0;
  }

  async tryTransition(
    reservationId: number,
    expectedState: string,
    newState: string,
    enforceNoOverlap: boolean,
  ): Promise<boolean> {
    // Build the overlap subquery guard dynamically
    const overlapGuard = enforceNoOverlap
      ? sql`AND NOT EXISTS (
          SELECT 1 FROM reservations o
          WHERE o.resource_id = reservations.resource_id
            AND o.state = 'CONFIRMED'
            AND o.id != reservations.id
            AND o.start_time < reservations.end_time
            AND o.end_time > reservations.start_time
        )`
      : sql``;

    // Execute the atomic compare-and-set update
    const result = await db.execute(sql`
      UPDATE reservations
      SET state = ${newState}
      WHERE id = ${reservationId}
        AND state = ${expectedState}
        ${overlapGuard}
    `);

    // pg returns the number of affected rows in result.rowCount
    return result.rowCount === 1;
  }
}
