import type {
  AvailabilityStatus,
  CheckAvailabilityPayload,
  CreateReservationPayload,
  Reservation,
  ReservationState,
  Resource,
} from "../types/reservation";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Handle both DomainError (string detail) and ZodError (array detail)
    const message = Array.isArray(data.detail)
      ? data.detail.map((e: { message: string }) => e.message).join(", ")
      : data.detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const reservationApi = {
  getResources: () =>
    apiRequest<{ resources: Resource[] }>("/api/resources").then(
      (res) => res.resources,
    ),

  listReservations: (filters?: {
    userId?: string;
    state?: ReservationState;
  }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.set("userId", filters.userId);
    if (filters?.state) params.set("state", filters.state);
    const query = params.toString() ? `?${params.toString()}` : "";

    return apiRequest<{ reservations: Reservation[] }>(
      `/api/reservations${query}`,
    ).then((res) => res.reservations);
  },

  checkAvailability: (payload: CheckAvailabilityPayload) =>
    apiRequest<{ status: AvailabilityStatus }>("/api/availability", {
      method: "POST",
      body: JSON.stringify(payload),
    }).then((res) => res.status),

  createReservation: (payload: CreateReservationPayload) =>
    apiRequest<Reservation>("/api/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  confirmReservation: (id: number) =>
    apiRequest<{ id: number; state: ReservationState }>(
      `/api/reservations/${id}/confirm`,
      { method: "POST" },
    ),

  cancelReservation: (id: number) =>
    apiRequest<{ id: number; state: ReservationState }>(
      `/api/reservations/${id}/cancel`,
      { method: "POST" },
    ),

  processApproval: (
    id: number,
    adminId: string,
    decision: "approve" | "reject",
    adminToken: string,
  ) =>
    apiRequest<{ id: number; state: ReservationState }>(
      `/api/reservations/${id}/approval`,
      {
        method: "POST",
        headers: { "x-admin-token": adminToken },
        body: JSON.stringify({ adminId, decision }),
      },
    ),

  cleanupExpired: (adminToken: string) =>
    apiRequest<{ cancelledCount: number }>("/api/admin/cleanup-expired", {
      method: "POST",
      headers: { "x-admin-token": adminToken },
    }),
};
