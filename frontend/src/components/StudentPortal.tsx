import { useEffect, useState, type SubmitEvent } from "react";
import { reservationApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
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
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [resourceId, setResourceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [availability, setAvailability] = useState<AvailabilityStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadReservations = async () => {
    try {
      const list = await reservationApi.listReservations();
      setReservations(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load reservations",
      );
    }
  };

  useEffect(() => {
    reservationApi
      .getResources()
      .then((list) => {
        setResources(list);
        if (list.length > 0) setResourceId(list[0].resourceId);
      })
      .catch((err) => setError(err.message));

    loadReservations();
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
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      setSuccess("Draft reservation created. Confirm it to lock in your slot.");
      await loadReservations();
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
      setSuccess(`Reservation #${id} updated to ${result.state}.`);
      await loadReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    }
  };

  const handleCancel = async (id: number) => {
    clearFeedback();
    try {
      await reservationApi.cancelReservation(id);
      setSuccess(`Reservation #${id} cancelled.`);
      await loadReservations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    }
  };

  return (
    <div className="grid-2">
      {/* Booking Form */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">Book a Study Room</h2>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {availability && (
          <div
            className={`alert ${availability === "AVAILABLE" ? "alert-info" : "alert-warning"}`}
          >
            Slot Status: <strong>{availability}</strong>
          </div>
        )}

        <form onSubmit={handleCreateDraft} className="form-stack">
          <div className="field">
            <label htmlFor="room">Study Room</label>
            <select
              id="room"
              className="select"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              required
            >
              {resources.map((r) => (
                <option key={r.resourceId} value={r.resourceId}>
                  {r.name} ({r.resourceId})
                  {r.resourceId.startsWith("VIP_") ? " — VIP Approval" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="startTime">Start Time</label>
            <input
              id="startTime"
              className="input"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="endTime">End Time</label>
            <input
              id="endTime"
              className="input"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="btn-row" style={{ marginTop: "0.25rem" }}>
            <button
              type="button"
              className="btn"
              onClick={handleCheckAvailability}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Check Slot
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ flex: 1 }}
            >
              Create Draft
            </button>
          </div>
        </form>
      </section>

      {/* Reservations List */}
      <section className="card">
        <div className="card-header">
          <h2 className="card-title">My Reservations ({user?.username})</h2>
          <button type="button" className="btn" onClick={loadReservations}>
            Refresh
          </button>
        </div>

        {reservations.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            No reservations yet. Create a draft on the left to get started.
          </p>
        ) : (
          <div className="item-list">
            {reservations.map((res) => (
              <div key={res.id} className="item-row">
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <strong>
                      #{res.id} — {res.resourceId}
                    </strong>
                    <span className={`badge badge-${res.state}`}>
                      {res.state}
                    </span>
                  </div>
                  <div className="item-meta">
                    {formatDateTime(res.startTime)} →{" "}
                    {formatDateTime(res.endTime)}
                  </div>
                </div>

                <div className="btn-row">
                  {res.state === "DRAFT" && (
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => handleConfirm(res.id)}
                    >
                      Confirm
                    </button>
                  )}
                  {res.state !== "CANCELLED" && (
                    <button
                      type="button"
                      className="btn btn-danger-outline"
                      onClick={() => handleCancel(res.id)}
                    >
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
