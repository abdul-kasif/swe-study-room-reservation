import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface ReservationCardProps {
  reservation: Reservation;
  loading: boolean;
  onDecision: (id: number, decision: "approve" | "reject") => void;
}

export function ReservationCard({
  reservation,
  loading,
  onDecision,
}: ReservationCardProps) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">
            #{reservation.id} — {reservation.resourceId}
          </span>
          <Badge className={getStateBadgeClass(reservation.state)}>
            {reservation.state.replace("_", " ")}
          </Badge>
          <span className="text-xs text-muted-foreground">
            by <strong className="text-foreground">{reservation.userId}</strong>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDateTime(reservation.startTime)} →{" "}
          {formatDateTime(reservation.endTime)}
        </p>
      </div>

      {reservation.state === "PENDING_APPROVAL" && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => onDecision(reservation.id, "approve")}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Check className="mr-1 h-3.5 w-3.5" />
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={() => onDecision(reservation.id, "reject")}
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}
