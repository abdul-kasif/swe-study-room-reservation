import { Calendar, DoorOpen } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Resource } from "@/types/reservation";

interface RoomDateFilterProps {
  resources: Resource[];
  selectedResourceId: string;
  selectedDate: string;
  minDate: string;
  onResourceChange: (resourceId: string) => void;
  onDateChange: (date: string) => void;
}

export function RoomDateFilter({
  resources,
  selectedResourceId,
  selectedDate,
  minDate,
  onResourceChange,
  onDateChange,
}: RoomDateFilterProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label
          htmlFor="room-select"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <DoorOpen className="h-4 w-4 text-muted-foreground" />
          Study Room
        </Label>
        <Select value={selectedResourceId} onValueChange={onResourceChange}>
          <SelectTrigger id="room-select" className="w-full">
            <SelectValue placeholder="Select a study room" />
          </SelectTrigger>
          <SelectContent>
            {resources.map((room) => (
              <SelectItem key={room.resourceId} value={room.resourceId}>
                {room.name} ({room.resourceId})
                {room.resourceId.startsWith("VIP_") ? " — VIP" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="date-select"
          className="flex items-center gap-1.5 text-sm font-medium"
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Date
        </Label>
        <Input
          id="date-select"
          type="date"
          min={minDate}
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </div>
    </div>
  );
}
