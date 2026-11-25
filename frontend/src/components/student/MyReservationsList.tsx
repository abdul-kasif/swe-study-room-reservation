import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Reservation, ReservationState } from "@/types/reservation";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStateBadgeClass(state: ReservationState): string {
  switch (state) {
    case "CONFIRMED":
      return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
    case "PENDING_APPROVAL":
      return "bg-amber-100 text-amber-800 hover:bg-amber-100";
    case "CANCELLED":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    default:
      return "bg-slate-100 text-slate-700 hover:bg-slate-100";
  }
}

interface MyReservationsListProps {
  username: string;
  reservations: Reservation[];
  onRefresh: () => void;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
}

export function MyReservationsList({
  username,
  reservations,
  onRefresh,
  onConfirm,
  onCancel,
}: MyReservationsListProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">My Reservations ({username})</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have no reservations yet. Select a time slot above to book a
            room.
          </p>
        ) : (
          <div className="space-y-3">
            {reservations.map((res) => (
              <div
                key={res.id}
                className="flex flex-col justify-between gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">
                      #{res.id} — {res.resourceId}
                    </span>
                    <Badge className={getStateBadgeClass(res.state)}>
                      {res.state.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(res.startTime)} →{" "}
                    {formatDateTime(res.endTime)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {res.state === "DRAFT" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onConfirm(res.id)}
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Confirm
                    </Button>
                  )}
                  {res.state !== "CANCELLED" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => onCancel(res.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
