import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reservationApi } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { BookedSlot, Reservation, Resource } from "@/types/reservation";
import { RoomDateFilter } from "./RoomDateFilter";
import { TimeSlotGrid, buildLocalSlotDate } from "./TimeSlotGrid";
import { BookingSummaryBar } from "./BookingSummaryBar";
import { MyReservationsList } from "./MyReservationsList";

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function StudentPortal() {
  const { user } = useAuth();
  const today = getTodayDateString();

  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);

  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const loadSchedule = async (resourceId: string, date: string) => {
    if (!resourceId || !date) return;
    setScheduleLoading(true);
    try {
      const res = await reservationApi.getRoomSchedule(resourceId, date);
      setBookedSlots(res.bookedSlots);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load room schedule",
      );
    } finally {
      setScheduleLoading(false);
    }
  };

  // Initial load: rooms + student's reservations
  useEffect(() => {
    reservationApi
      .getResources()
      .then((list) => {
        setResources(list);
        if (list.length > 0) setSelectedResourceId(list[0].resourceId);
      })
      .catch((err) => setError(err.message));

    loadReservations();
  }, []);

  // Reload schedule whenever room or date changes
  useEffect(() => {
    setSelectedHours([]);
    if (selectedResourceId && selectedDate) {
      loadSchedule(selectedResourceId, selectedDate);
    }
  }, [selectedResourceId, selectedDate]);

  const handleToggleHour = (hour: number) => {
    setError(null);
    setSuccess(null);

    if (selectedHours.includes(hour)) {
      // Allow deselecting from either end; if middle clicked, reset to just that hour
      const sorted = [...selectedHours].sort((a, b) => a - b);
      if (hour === sorted[0] || hour === sorted[sorted.length - 1]) {
        setSelectedHours(sorted.filter((h) => h !== hour));
      } else {
        setSelectedHours([hour]);
      }
      return;
    }

    if (selectedHours.length === 0) {
      setSelectedHours([hour]);
      return;
    }

    const sorted = [...selectedHours].sort((a, b) => a - b);
    const isAdjacent =
      hour === sorted[0] - 1 || hour === sorted[sorted.length - 1] + 1;

    if (!isAdjacent) {
      // Start a fresh selection at the newly clicked slot
      setSelectedHours([hour]);
      return;
    }

    if (selectedHours.length >= 4) {
      setError("You can select up to 4 contiguous hours per booking.");
      return;
    }

    setSelectedHours([...sorted, hour].sort((a, b) => a - b));
  };

  const handleConfirmBooking = async () => {
    if (!selectedResourceId || selectedHours.length === 0) return;

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const sorted = [...selectedHours].sort((a, b) => a - b);
    const startTime = buildLocalSlotDate(selectedDate, sorted[0]).toISOString();
    const endTime = buildLocalSlotDate(
      selectedDate,
      sorted[sorted.length - 1] + 1,
    ).toISOString();

    try {
      const draft = await reservationApi.createReservation({
        resourceId: selectedResourceId,
        startTime,
        endTime,
      });
      const confirmed = await reservationApi.confirmReservation(draft.id);

      setSelectedHours([]);
      setSuccess(
        confirmed.state === "PENDING_APPROVAL"
          ? `VIP reservation #${confirmed.id} submitted for Admin approval.`
          : `Reservation #${confirmed.id} confirmed!`,
      );
      await Promise.all([
        loadSchedule(selectedResourceId, selectedDate),
        loadReservations(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      await Promise.all([
        loadSchedule(selectedResourceId, selectedDate),
        loadReservations(),
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmExisting = async (id: number) => {
    setError(null);
    setSuccess(null);
    try {
      const result = await reservationApi.confirmReservation(id);
      setSuccess(`Reservation #${id} updated to ${result.state}.`);
      await Promise.all([
        loadSchedule(selectedResourceId, selectedDate),
        loadReservations(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    }
  };

  const handleCancelExisting = async (id: number) => {
    setError(null);
    setSuccess(null);
    try {
      await reservationApi.cancelReservation(id);
      setSuccess(`Reservation #${id} cancelled.`);
      await Promise.all([
        loadSchedule(selectedResourceId, selectedDate),
        loadReservations(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    }
  };

  const selectedResource = resources.find(
    (r) => r.resourceId === selectedResourceId,
  );

  return (
    <div className="space-y-5">
      {error && (
        <Alert
          variant="destructive"
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertDescription>{error}</AlertDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-red-100"
            onClick={() => setError(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </Alert>
      )}
      {success && (
        <Alert className="flex items-center justify-between border-emerald-200 bg-emerald-50 text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <AlertDescription>{success}</AlertDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-emerald-800 hover:bg-emerald-100"
            onClick={() => setSuccess(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_1fr] lg:items-stretch">
        {/* Left: Visual Timetable Card */}
        <Card className="flex flex-col">
          <CardHeader className="flex min-h-[3.5rem] flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Book a Study Room</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-6">
            <RoomDateFilter
              resources={resources}
              selectedResourceId={selectedResourceId}
              selectedDate={selectedDate}
              minDate={today}
              onResourceChange={setSelectedResourceId}
              onDateChange={setSelectedDate}
            />

            <TimeSlotGrid
              selectedDate={selectedDate}
              bookedSlots={bookedSlots}
              selectedHours={selectedHours}
              loading={scheduleLoading}
              onToggleHour={handleToggleHour}
            />

            <BookingSummaryBar
              resourceId={selectedResourceId}
              resourceName={selectedResource?.name || selectedResourceId}
              selectedDate={selectedDate}
              selectedHours={selectedHours}
              submitting={submitting}
              onConfirmBooking={handleConfirmBooking}
              onClearSelection={() => setSelectedHours([])}
            />
          </CardContent>
        </Card>

        {/* Right: Student's Reservations (matches left card height, scrolls internally) */}
        <div className="relative min-h-[520px] lg:min-h-0">
          <div className="lg:absolute lg:inset-0">
            <MyReservationsList
              username={user?.username || ""}
              resources={resources}
              reservations={reservations}
              onRefresh={loadReservations}
              onConfirm={handleConfirmExisting}
              onCancel={handleCancelExisting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
