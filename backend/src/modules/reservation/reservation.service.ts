import { ReservationRepository } from "./reservation.repository";
import { BookingPolicy, ReservationDomain } from "./reservation.domain";
import {
  ReservationNotFoundError,
  InvalidStateTransitionError,
  ReservationConflictError,
  ResourceNotFoundError,
} from "../../core/errors";
import type {
  CheckAvailabilityBody,
  CreateReservationBody,
} from "./reservation.schema";

export class ReservationService {
  constructor(private readonly repository: ReservationRepository) {}

  async createReservation(
    dto: CreateReservationBody,
  ): Promise<ReservationDomain> {
    // 1. Verify resource exists and is active
    const resource = await this.repository.getResourceById(dto.resourceId);
    if (!resource || !resource.isActive) {
      throw new ResourceNotFoundError(
        `Resource '${dto.resourceId}' does not exist or is inactive`,
      );
    }

    // 2. Compute UTC day window for quota check
    const dayStart = new Date(dto.startTime);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    // 3. Enforce pure domain policy
    const activeBookings = await this.repository.getActiveForUserOnDay(
      dto.userId,
      dayStart,
      dayEnd,
    );
    BookingPolicy.validateDailyQuota(
      activeBookings,
      dto.startTime,
      dto.endTime,
    );

    // 4. Persist as DRAFT
    const created = await this.repository.create({
      resourceId: dto.resourceId,
      userId: dto.userId,
      startTime: dto.startTime,
      endTime: dto.endTime,
      state: "DRAFT",
    });

    return new ReservationDomain(
      created.id,
      created.resourceId,
      created.startTime,
      created.endTime,
      created.state,
    );
  }

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
    _adminId: string,
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

  async cancelReservation(
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

    const previousState = reservation.state;
    const stateChanged = reservation.cancel(now);
    if (!stateChanged) {
      return reservation;
    }

    const applied = await this.repository.tryTransition(
      reservation.id,
      previousState,
      "CANCELLED",
      false, // No overlap check needed when cancelling
    );

    if (!applied) {
      const current = await this.repository.getById(reservation.id);
      if (current?.state === "CANCELLED") {
        return reservation; // Another request already cancelled it
      }
      throw new InvalidStateTransitionError(
        "Reservation state changed concurrently; please retry",
      );
    }

    return reservation;
  }

  async checkAvailability(
    dto: CheckAvailabilityBody,
  ): Promise<"AVAILABLE" | "UNAVAILABLE"> {
    const resource = await this.repository.getResourceById(dto.resourceId);
    if (!resource || !resource.isActive) {
      throw new ResourceNotFoundError(
        `Resource '${dto.resourceId}' does not exist or is inactive`,
      );
    }

    // 2. Check for any overlapping CONFIRMED reservation
    const hasOverlap = await this.repository.hasConfirmedOverlap(
      dto.resourceId,
      dto.startTime,
      dto.endTime,
    );

    return hasOverlap ? "UNAVAILABLE" : "AVAILABLE";
  }

  async cleanupExpiredReservations(now: Date = new Date()): Promise<number> {
    return this.repository.cleanupExpired(now);
  }
}
