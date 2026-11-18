import { ReservationRepository } from "./reservation.repository";
import { ReservationDomain } from "./reservation.domain";
import {
  ReservationNotFoundError,
  InvalidStateTransitionError,
  ReservationConflictError,
} from "../../core/errors";

export class ReservationService {
  constructor(private readonly repository: ReservationRepository) {}

  async confirmReservation(
    reservationId: number,
    now: Date = new Date(),
  ): Promise<ReservationDomain> {
    const record = await this.repository.getById(reservationId);
    if (!record) {
      throw new ReservationNotFoundError("Reservation not found");
    }

    const reservation = new ReservationDomain(
      record.id,
      record.resourceId,
      record.startTime,
      record.endTime,
      record.state,
    );

    reservation.ensureCanConfirm(now);

    const hasConflict = await this.repository.hasConfirmedOverlap(
      reservation.resourceId,
      reservation.startTime,
      reservation.endTime,
      reservation.id,
    );
    const requiresApproval = ReservationDomain.requiresAdminApproval(
      reservation.resourceId,
    );

    reservation.confirm(hasConflict, requiresApproval);

    const applied = await this.repository.tryTransition(
      reservation.id,
      "DRAFT",
      reservation.state,
      true,
    );

    if (!applied) {
      const current = await this.repository.getById(reservation.id);
      if (current?.state !== "DRAFT") {
        throw new InvalidStateTransitionError(
          "Reservation state changed concurrently; please retry",
        );
      }
      throw new ReservationConflictError(
        "Conflict: Resource was already booked by another user",
      );
    }

    return reservation;
  }

  async processApproval(
    reservationId: number,
    adminId: string,
    decision: "approve" | "reject",
    now: Date = new Date(),
  ): Promise<ReservationDomain> {
    const record = await this.repository.getById(reservationId);
    if (!record) {
      throw new ReservationNotFoundError("Reservation not found");
    }

    const reservation = new ReservationDomain(
      record.id,
      record.resourceId,
      record.startTime,
      record.endTime,
      record.state,
    );

    reservation.ensureCanProcessApproval();

    if (decision === "reject") {
      reservation.reject();
      await this.repository.tryTransition(
        reservation.id,
        "PENDING_APPROVAL",
        reservation.state,
        false,
      );
      return reservation;
    }

    if (reservation.isExpired(now)) {
      reservation.markExpired();
      await this.repository.tryTransition(
        reservation.id,
        "PENDING_APPROVAL",
        reservation.state,
        false,
      );
      throw new InvalidStateTransitionError(
        "Approval expired: Start time has already passed; state set to CANCELLED",
      );
    }

    const hasConflict = await this.repository.hasConfirmedOverlap(
      reservation.resourceId,
      reservation.startTime,
      reservation.endTime,
      reservation.id,
    );

    reservation.approve(hasConflict);

    const applied = await this.repository.tryTransition(
      reservation.id,
      "PENDING_APPROVAL",
      reservation.state,
      true,
    );

    if (!applied) {
      const current = await this.repository.getById(reservation.id);
      if (current?.state !== "PENDING_APPROVAL") {
        throw new InvalidStateTransitionError(
          "Reservation state changed concurrently; please retry",
        );
      }
      throw new ReservationConflictError(
        "Conflict: Resource was already booked by another user",
      );
    }

    return reservation;
  }
}
