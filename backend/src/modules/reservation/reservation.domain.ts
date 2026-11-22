import {
  DailyQuotaExceededError,
  InvalidStateTransitionError,
  ReservationConflictError,
} from "../../core/errors";

export class ReservationDomain {
  constructor(
    public readonly id: number,
    public readonly resourceId: string,
    public readonly startTime: Date,
    public readonly endTime: Date,
    public state: string,
  ) {}

  public ensureCanCancel(now: Date): void {
    if (this.state === "CANCELLED") {
      return;
    }
    if (now >= this.startTime) {
      throw new InvalidStateTransitionError(
        "Policy Violation: Cannot cancel a reservation after its start time",
      );
    }
  }

  public ensureCanConfirm(now: Date): void {
    if (this.state !== "DRAFT") {
      throw new InvalidStateTransitionError(
        "Only DRAFT reservations can be confirmed",
      );
    }
    if (now >= this.startTime) {
      throw new InvalidStateTransitionError(
        "Cannot confirm a reservation in the past",
      );
    }
  }

  public ensureCanProcessApproval(): void {
    if (this.state !== "PENDING_APPROVAL") {
      throw new InvalidStateTransitionError(
        "Only PENDING_APPROVAL reservations can be approved or rejected",
      );
    }
  }

  public isExpired(now: Date): boolean {
    return now >= this.startTime;
  }

  public markExpired(): void {
    this.ensureCanProcessApproval();
    this.state = "CANCELLED";
  }

  public approve(hasConflict: boolean): void {
    this.ensureCanProcessApproval();
    if (hasConflict) {
      throw new ReservationConflictError(
        "Conflict: Resource was already confirmed for an overlapping slot",
      );
    }
    this.state = "CONFIRMED";
  }

  public reject(): void {
    this.ensureCanProcessApproval();
    this.state = "CANCELLED";
  }

  public confirm(hasConflict: boolean, requiresApproval: boolean): void {
    if (hasConflict) {
      throw new ReservationConflictError(
        "Conflict: Resource was already booked by another user",
      );
    }

    this.state = requiresApproval ? "PENDING_APPROVAL" : "CONFIRMED";
  }

  /**
   * Transitions to CANCELLED if strictly before startTime.
   * Returns true if the state changed, false if already CANCELLED (idempotent).
   */
  public cancel(now: Date): boolean {
    if (this.state === "CANCELLED") {
      return false;
    }
    this.ensureCanCancel(now);
    this.state = "CANCELLED";
    return true;
  }

  public static requiresAdminApproval(resourceId: string): boolean {
    return resourceId.startsWith("VIP_");
  }
}

export class BookingPolicy {
  private static readonly MAX_DAILY_MS = 4 * 60 * 60 * 1000; // 4 hours

  public static validateDailyQuota(
    existingBookings: Array<{ startTime: Date; endTime: Date }>,
    newStart: Date,
    newEnd: Date,
  ): void {
    const existingMs = existingBookings.reduce(
      (sum, b) => sum + (b.endTime.getTime() - b.startTime.getTime()),
      0,
    );
    const requestedMs = newEnd.getTime() - newStart.getTime();

    if (existingMs + requestedMs > this.MAX_DAILY_MS) {
      throw new DailyQuotaExceededError(
        "Domain Rule Violation: 4-hour daily booking limit exceeded",
      );
    }
  }
}
