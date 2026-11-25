import { useEffect, useState } from "react";
import { reservationApi } from "../api/client";
import type { Reservation } from "../types/reservation";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AdminFilter = "PENDING_APPROVAL" | "ALL";

export function AdminPortal() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<AdminFilter>("PENDING_APPROVAL");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const loadReservations = async (targetFilter = filter) => {
    setError(null);
    try {
      const list = await reservationApi.listReservations(
        targetFilter === "PENDING_APPROVAL"
          ? { state: "PENDING_APPROVAL" }
          : undefined,
      );
      setItems(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load reservations",
      );
    }
  };

  useEffect(() => {
    loadReservations(filter);
  }, [filter]);

  const handleDecision = async (id: number, decision: "approve" | "reject") => {
    clearFeedback();
    setLoading(true);
    try {
      const result = await reservationApi.processApproval(id, decision);
      setSuccess(`Reservation #${id} updated to ${result.state}.`);
      await loadReservations(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      await loadReservations(filter);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupExpired = async () => {
    clearFeedback();
    setLoading(true);
    try {
      const { cancelledCount } = await reservationApi.cleanupExpired();
      setSuccess(
        `Cleanup complete: ${cancelledCount} stale reservation(s) cancelled.`,
      );
      await loadReservations(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Maintenance Bar */}
      <section
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2 className="card-title">Admin Operations</h2>
          <div className="item-meta">
            Approve VIP room requests or clear expired drafts and pending
            bookings.
          </div>
        </div>
        <button
          type="button"
          className="btn btn-admin"
          onClick={handleCleanupExpired}
          disabled={loading}
        >
          Cleanup Expired Reservations
        </button>
      </section>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Queue / All Reservations */}
      <section className="card">
        <div
          className="card-header"
          style={{ flexWrap: "wrap", gap: "0.75rem" }}
        >
          <div className="btn-row">
            <button
              type="button"
              className={`btn ${filter === "PENDING_APPROVAL" ? "btn-admin" : ""}`}
              onClick={() => setFilter("PENDING_APPROVAL")}
            >
              Pending VIP Approvals
            </button>
            <button
              type="button"
              className={`btn ${filter === "ALL" ? "btn-admin" : ""}`}
              onClick={() => setFilter("ALL")}
            >
              All Reservations
            </button>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => loadReservations(filter)}
            disabled={loading}
          >
            Refresh
          </button>
        </div>

        {items.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            {filter === "PENDING_APPROVAL"
              ? "No reservations awaiting approval."
              : "No reservations found."}
          </p>
        ) : (
          <div className="item-list">
            {items.map((res) => (
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
                    <span
                      style={{ fontSize: "0.85rem", color: "var(--muted)" }}
                    >
                      by <strong>{res.userId}</strong>
                    </span>
                  </div>
                  <div className="item-meta">
                    {formatDateTime(res.startTime)} →{" "}
                    {formatDateTime(res.endTime)}
                  </div>
                </div>

                {res.state === "PENDING_APPROVAL" && (
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn-success"
                      disabled={loading}
                      onClick={() => handleDecision(res.id, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger-outline"
                      disabled={loading}
                      onClick={() => handleDecision(res.id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
