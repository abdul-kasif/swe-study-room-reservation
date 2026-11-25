import type {
  AuthResponse,
  AvailabilityStatus,
  CheckAvailabilityPayload,
  CreateReservationPayload,
  Reservation,
  ReservationState,
  Resource,
  RoomScheduleResponse,
  UserRole,
} from "../types/reservation";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
export const TOKEN_STORAGE_KEY = "study_room_jwt";

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authenticated) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = Array.isArray(data.detail)
      ? data.detail.map((e: { message: string }) => e.message).join(", ")
      : data.detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const authApi = {
  login: (username: string, password: string, expectedRole: UserRole) =>
    apiRequest<AuthResponse>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username, password, expectedRole }),
      },
      false,
    ),

  registerStudent: (username: string, fullName: string, password: string) =>
    apiRequest<AuthResponse>(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({ username, fullName, password }),
      },
      false,
    ),
};

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

  processApproval: (id: number, decision: "approve" | "reject") =>
    apiRequest<{ id: number; state: ReservationState }>(
      `/api/reservations/${id}/approval`,
      {
        method: "POST",
        body: JSON.stringify({ decision }),
      },
    ),

  cleanupExpired: () =>
    apiRequest<{ cancelledCount: number }>("/api/admin/cleanup-expired", {
      method: "POST",
    }),

  getRoomSchedule: (resourceId: string, date: string) =>
    apiRequest<RoomScheduleResponse>(
      `/api/resources/${encodeURIComponent(resourceId)}/schedule?date=${encodeURIComponent(date)}`,
    ),
};
