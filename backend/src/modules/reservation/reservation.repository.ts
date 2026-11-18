import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db";
import { reservations, type Reservation } from "../../db/schema";

export class ReservationRepository {
  async getById(id: number): Promise<Reservation | undefined> {
    const result = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id));
    return result[0];
  }

  async hasConfirmedOverlap(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeId: number,
  ): Promise<boolean> {
    const result = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.resourceId, resourceId),
          eq(reservations.state, "CONFIRMED"),
          sql`${reservations.id} != ${excludeId}`,
          sql`${reservations.startTime} < ${endTime}`,
          sql`${reservations.endTime} > ${startTime}`,
        ),
      )
      .limit(1);

    return result.length > 0;
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
}
