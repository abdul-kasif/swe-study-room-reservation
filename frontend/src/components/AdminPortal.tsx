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

export function AdminPortal() {
  const [pending, setPending] = useState<Reservation[]>([]);
  const [adminId, setAdminId] = useState("admin1");
  const [adminToken, setAdminToken] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  const loadPending = async () => {
    setError(null);
    try {
      const list = await reservationApi.listReservations({
        state: "PENDING_APPROVAL",
      });
      setPending(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load pending approvals",
      );
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleDecision = async (id: number, decision: "approve" | "reject") => {
    clearFeedback();
    if (!adminToken.trim()) {
      setError("Please enter the Admin Token first.");
      return;
    }

    setLoading(true);
    try {
      const result = await reservationApi.processApproval(
        id,
        adminId.trim() || "admin1",
        decision,
        adminToken.trim(),
      );
      setSuccess(`Reservation #${id} updated to ${result.state}.`);
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      await loadPending(); // Refresh in case an expired booking auto-cancelled
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupExpired = async () => {
    clearFeedback();
    if (!adminToken.trim()) {
      setError("Please enter the Admin Token first.");
      return;
    }

    setLoading(true);
    try {
      const { cancelledCount } = await reservationApi.cleanupExpired(
        adminToken.trim(),
      );
      setSuccess(
        `Cleanup complete: ${cancelledCount} stale reservation(s) cancelled.`,
      );
      await loadPending();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cleanup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Bar: Admin Credentials & Maintenance */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: "1.25rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <label>
            <div>
              <strong>Admin ID</strong>
            </div>
            <input
              type="text"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              style={{ padding: "0.5rem", marginTop: 4 }}
            />
          </label>

          <label>
            <div>
              <strong>Admin Token (X-Admin-Token)</strong>
            </div>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Enter ADMIN_TOKEN"
              style={{ padding: "0.5rem", marginTop: 4, minWidth: 220 }}
            />
          </label>
        </div>

        <button
          type="button"
          onClick={handleCleanupExpired}
          disabled={loading}
          style={{ padding: "0.6rem 1rem", fontWeight: "bold" }}
        >
          Cleanup Expired Reservations
        </button>
      </section>

      {/* Feedback Banners */}
      {error && (
        <div
          style={{
            background: "#fdecea",
            color: "#b71c1c",
            padding: "0.75rem",
            borderRadius: 6,
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
          }}
        >
          {success}
        </div>
      )}

      {/* Pending VIP Approvals Queue */}
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
          <h2 style={{ margin: 0 }}>
            Pending VIP Approvals ({pending.length})
          </h2>
          <button type="button" onClick={loadPending} disabled={loading}>
            Refresh
          </button>
        </div>

        {pending.length === 0 ? (
          <p style={{ color: "#666" }}>No reservations awaiting approval.</p>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            {pending.map((res) => (
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
                    <span style={{ color: "#555", marginLeft: 8 }}>
                      by <strong>{res.userId}</strong>
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
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDecision(res.id, "approve")}
                    style={{ padding: "0.45rem 0.9rem", fontWeight: "bold" }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => handleDecision(res.id, "reject")}
                    style={{ padding: "0.45rem 0.9rem" }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
