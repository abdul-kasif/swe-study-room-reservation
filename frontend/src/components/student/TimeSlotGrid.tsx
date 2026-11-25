import { Clock } from "lucide-react";
import type { BookedSlot } from "@/types/reservation";

const START_HOUR = 0; // 12:00 AM
const END_HOUR = 24; // 12:00 AM next day (last slot is 11:00 PM – 12:00 AM)
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function buildLocalSlotDate(dateStr: string, hour: number): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

interface TimeSlotGridProps {
  selectedDate: string;
  bookedSlots: BookedSlot[];
  selectedHours: number[];
  loading: boolean;
  onToggleHour: (hour: number) => void;
}

export function TimeSlotGrid({
  selectedDate,
  bookedSlots,
  selectedHours,
  loading,
  onToggleHour,
}: TimeSlotGridProps) {
  const now = new Date();

  const isBooked = (hour: number): boolean => {
    const slotStart = buildLocalSlotDate(selectedDate, hour).getTime();
    const slotEnd = buildLocalSlotDate(selectedDate, hour + 1).getTime();

    return bookedSlots.some((b) => {
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return slotStart < bEnd && slotEnd > bStart;
    });
  };

  const isPast = (hour: number): boolean => {
    return buildLocalSlotDate(selectedDate, hour).getTime() <= now.getTime();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="h-16 animate-pulse rounded-lg border bg-muted/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-50" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-blue-600 bg-blue-600" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-red-300 bg-red-100" />
          Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-slate-200 bg-slate-100" />
          Past
        </span>
      </div>

      {/* Hourly Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {HOURS.map((hour) => {
          const booked = isBooked(hour);
          const past = isPast(hour);
          const selected = selectedHours.includes(hour);
          const disabled = booked || past;

          let slotStyle =
            "border-emerald-200 bg-emerald-50/60 text-emerald-950 hover:border-emerald-400 hover:bg-emerald-100/70";
          let statusLabel = "Available";

          if (booked) {
            slotStyle =
              "border-red-200 bg-red-50 text-red-700 cursor-not-allowed opacity-90";
            statusLabel = "Booked";
          } else if (past) {
            slotStyle =
              "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed";
            statusLabel = "Past";
          } else if (selected) {
            slotStyle =
              "border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700";
            statusLabel = "Selected";
          }

          return (
            <button
              key={hour}
              type="button"
              disabled={disabled}
              onClick={() => onToggleHour(hour)}
              className={`flex flex-col items-start justify-between rounded-lg border p-3 text-left transition-colors ${slotStyle}`}
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Clock className="h-3.5 w-3.5" />
                {formatHour(hour)} – {formatHour(hour + 1)}
              </span>
              <span className="mt-1 text-xs font-medium opacity-90">
                {statusLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
