import {
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

  public confirm(hasConflict: boolean, requiresApproval: boolean): void {
    if (hasConflict) {
      throw new ReservationConflictError(
        "Conflict: Resource was already booked by another user",
      );
    }

    this.state = requiresApproval ? "PENDING_APPROVAL" : "CONFIRMED";
  }

  public static requiresAdminApproval(resourceId: string): boolean {
    return resourceId.startsWith("VIP_");
  }
}
