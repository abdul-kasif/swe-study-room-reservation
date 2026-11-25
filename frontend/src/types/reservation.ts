export type UserRole = "STUDENT" | "ADMIN";

export interface AuthUser {
  username: string;
  fullName: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type ReservationState =
  "DRAFT" | "PENDING_APPROVAL" | "CONFIRMED" | "CANCELLED";

export type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE";

export interface Resource {
  resourceId: string;
  name: string;
  isActive: boolean;
}

export interface Reservation {
  id: number;
  resourceId: string;
  userId: string;
  startTime: string;
  endTime: string;
  state: ReservationState;
}

export interface CreateReservationPayload {
  resourceId: string;
  startTime: string;
  endTime: string;
}

export interface CheckAvailabilityPayload {
  resourceId: string;
  startTime: string;
  endTime: string;
}
