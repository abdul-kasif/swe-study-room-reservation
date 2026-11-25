import { CheckCircle2, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatHour } from "./TimeSlotGrid";

interface BookingSummaryBarProps {
  resourceId: string;
  resourceName: string;
  selectedDate: string;
  selectedHours: number[];
  submitting: boolean;
  onConfirmBooking: () => void;
  onClearSelection: () => void;
}

export function BookingSummaryBar({
  resourceId,
  resourceName,
  selectedDate,
  selectedHours,
  submitting,
  onConfirmBooking,
  onClearSelection,
}: BookingSummaryBarProps) {
  if (selectedHours.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        Click any available time slot above to select your booking window (up to
        4 contiguous hours).
      </div>
    );
  }

  const sorted = [...selectedHours].sort((a, b) => a - b);
  const startHour = sorted[0];
  const endHour = sorted[sorted.length - 1] + 1;
  const isVip = resourceId.startsWith("VIP_");

  return (
    <div className="flex flex-col justify-between gap-4 rounded-lg border border-blue-200 bg-blue-50/70 p-4 sm:flex-row sm:items-center">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-900">{resourceName}</span>
          <Badge variant="secondary">{selectedDate}</Badge>
          <Badge className="bg-blue-600 text-white hover:bg-blue-600">
            {formatHour(startHour)} – {formatHour(endHour)} ({sorted.length}h)
          </Badge>
        </div>
        {isVip && (
          <p className="flex items-center gap-1.5 text-xs text-amber-700">
            <ShieldAlert className="h-3.5 w-3.5" />
            VIP room: submitting will send this request for Admin approval.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={submitting}
        >
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
        <Button
          type="button"
          onClick={onConfirmBooking}
          disabled={submitting}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          {submitting
            ? "Booking..."
            : isVip
              ? "Request VIP Booking"
              : "Confirm Booking"}
        </Button>
      </div>
    </div>
  );
}
