import { useEffect, useState, type SubmitEvent } from "react";
import { reservationApi } from "../api/client";
import type {
  AvailabilityStatus,
  Reservation,
  Resource,
} from "../types/reservation";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StudentPortal() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [userId, setUserId] = useState("student1");
  const [resourceId, setResourceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [availability, setAvailability] = useState<AvailabilityStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load active rooms on mount
  useEffect(() => {
    reservationApi
      .getResources()
      .then((list) => {
        setResources(list);
        if (list.length > 0) setResourceId(list[0].resourceId);
      })
      .catch((err) => setError(err.message));
  }, []);

  const loadReservations = async (targetUserId = userId) => {
    if (!targetUserId.trim()) return;
    setError(null);
    try {
      const list = await reservationApi.listReservations({
        userId: targetUserId.trim(),
      });
      setReservations(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load reservations",
      );
    }
  };

  // Load initial user's reservations on mount
  useEffect(() => {
    loadReservations("student1");
  }, []);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCheckAvailability = async () => {
    clearFeedback();
    setAvailability(null);

    if (!resourceId || !startTime || !endTime) {
      setError("Please select a room, start time, and end time first.");
      return;
    }

    setLoading(true);
    try {
      const status = await reservationApi.checkAvailability({
        resourceId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setAvailability(status);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Availability check failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async (e: SubmitEvent) => {
    e.preventDefault();
    clearFeedback();
    setAvailability(null);
    setLoading(true);

    try {
      await reservationApi.createReservation({
        resourceId,
        userId: userId.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setSuccess("Draft reservation created.");
      await loadReservations(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create draft");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id: number) => {
    clearFeedback();
    try {
      const result = await reservationApi.confirmReservation(id);
      setSuccess(`Reservation #${id} is now ${result.state}.`);
      await loadReservations(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    }
  };

  const handleCancel = async (id: number) => {
    clearFeedback();
    try {
      await reservationApi.cancelReservation(id);
      setSuccess(`Reservation #${id} cancelled.`);
      await loadReservations(userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    }
  };

  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "2rem" }}
    >
      {/* Left Column: Booking Form */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1.25rem",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Book a Study Room</h2>

        {error && (
          <div
            style={{
              background: "#fdecea",
              color: "#b71c1c",
              padding: "0.75rem",
              borderRadius: 6,
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              background: "#e8f5e9",
              color: "#1b5e20",
              padding: "0.75rem",
              borderRadius: 6,
              marginBottom: "1rem",
            }}
          >
            {success}
          </div>
        )}
        {availability && (
          <div
            style={{
              background: availability === "AVAILABLE" ? "#e3f2fd" : "#fff3e0",
              color: availability === "AVAILABLE" ? "#0d47a1" : "#e65100",
              padding: "0.75rem",
              borderRadius: 6,
              marginBottom: "1rem",
            }}
          >
            Slot Status: <strong>{availability}</strong>
          </div>
        )}

        <form
          onSubmit={handleCreateDraft}
          style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}
        >
          <label>
            <div>
              <strong>User ID</strong>
            </div>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", marginTop: 4 }}
            />
          </label>

          <label>
            <div>
              <strong>Study Room</strong>
            </div>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", marginTop: 4 }}
            >
              {resources.map((r) => (
                <option key={r.resourceId} value={r.resourceId}>
                  {r.name} ({r.resourceId})
                  {r.resourceId.startsWith("VIP_")
                    ? " — Requires Approval"
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div>
              <strong>Start Time</strong>
            </div>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", marginTop: 4 }}
            />
          </label>

          <label>
            <div>
              <strong>End Time</strong>
            </div>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem", marginTop: 4 }}
            />
          </label>

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={handleCheckAvailability}
              disabled={loading}
              style={{ flex: 1, padding: "0.6rem" }}
            >
              Check Availability
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1, padding: "0.6rem", fontWeight: "bold" }}
            >
              Create Draft
            </button>
          </div>
        </form>
      </section>

      {/* Right Column: Reservation List */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2 style={{ margin: 0 }}>My Reservations ({userId})</h2>
          <button type="button" onClick={() => loadReservations(userId)}>
            Refresh
          </button>
        </div>

        {reservations.length === 0 ? (
          <p style={{ color: "#666" }}>No reservations found for this user.</p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {reservations.map((res) => (
              <div
                key={res.id}
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: 6,
                  padding: "0.85rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div>
                    <strong>
                      #{res.id} — {res.resourceId}
                    </strong>{" "}
                    <span
                      style={{
                        fontSize: "0.8rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: 4,
                        background: "#eee",
                        marginLeft: 6,
                      }}
                    >
                      {res.state}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: "0.85rem", color: "#555", marginTop: 4 }}
                  >
                    {formatDateTime(res.startTime)} →{" "}
                    {formatDateTime(res.endTime)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {res.state === "DRAFT" && (
                    <button type="button" onClick={() => handleConfirm(res.id)}>
                      Confirm
                    </button>
                  )}
                  {res.state !== "CANCELLED" && (
                    <button type="button" onClick={() => handleCancel(res.id)}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
