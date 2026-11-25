import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { reservationApi } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Reservation } from "@/types/reservation";
import { AdminToolbar } from "./AdminToolbar";
import { ReservationCard } from "./ReservationCard";

type AdminFilter = "PENDING_APPROVAL" | "ALL";

export function AdminPortal() {
  const [items, setItems] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<AdminFilter>("PENDING_APPROVAL");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    setError(null);
    setSuccess(null);
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
    setError(null);
    setSuccess(null);
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
    <div className="space-y-6">
      <AdminToolbar loading={loading} onCleanupExpired={handleCleanupExpired} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-col justify-between gap-3 space-y-0 pb-4 sm:flex-row sm:items-center">
          <Tabs
            value={filter}
            onValueChange={(v) => setFilter(v as AdminFilter)}
          >
            <TabsList>
              <TabsTrigger value="PENDING_APPROVAL">
                Pending VIP Approvals
              </TabsTrigger>
              <TabsTrigger value="ALL">All Reservations</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadReservations(filter)}
            disabled={loading}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {filter === "PENDING_APPROVAL"
                ? "No reservations awaiting approval."
                : "No reservations found."}
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((res) => (
                <ReservationCard
                  key={res.id}
                  reservation={res}
                  loading={loading}
                  onDecision={handleDecision}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
