import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  Reservation,
  ReservationState,
  Resource,
} from "@/types/reservation";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDateString(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  resources: Resource[];
  reservations: Reservation[];
  onRefresh: () => void;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
}

export function MyReservationsList({
  username,
  resources,
  reservations,
  onRefresh,
  onConfirm,
  onCancel,
}: MyReservationsListProps) {
  const [roomFilter, setRoomFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  const hasActiveFilters = roomFilter !== "ALL" || dateFilter !== "";

  const filteredReservations = reservations.filter((res) => {
    const matchesRoom = roomFilter === "ALL" || res.resourceId === roomFilter;
    const matchesDate =
      dateFilter === "" || toLocalDateString(res.startTime) === dateFilter;
    return matchesRoom && matchesDate;
  });

  const clearFilters = () => {
    setRoomFilter("ALL");
    setDateFilter("");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">My Reservations ({username})</CardTitle>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filter Box */}
        <div className="rounded-lg border bg-slate-50/70 p-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="h-9 bg-white text-xs">
                <SelectValue placeholder="Filter by room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Rooms</SelectItem>
                {resources.map((room) => (
                  <SelectItem key={room.resourceId} value={room.resourceId}>
                    {room.name} ({room.resourceId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-9 bg-white text-xs"
              aria-label="Filter by date"
            />
          </div>

          {hasActiveFilters && (
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {filteredReservations.length} of {reservations.length}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 px-2 text-xs"
              >
                <X className="mr-1 h-3 w-3" />
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {/* Reservations List */}
        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have no reservations yet. Select a time slot on the left to book
            a room.
          </p>
        ) : filteredReservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reservations match the selected room or date.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredReservations.map((res) => (
              <div
                key={res.id}
                className="flex flex-col justify-between gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
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
