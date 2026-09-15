import { minutesFromTime } from "@/lib/catalog/hours";
import type { ItineraryDay } from "./types";

export function findDayConflicts(day: ItineraryDay, dayEnd: string): string[] {
  const conflicts: string[] = [];
  let previousEnd = -1;

  for (const stop of day.stops) {
    const start = minutesFromTime(stop.startTime);
    if (start < previousEnd) conflicts.push(`${stop.place.name} overlaps the previous stop.`);
    previousEnd = start + stop.durationMinutes;
  }

  if (previousEnd > minutesFromTime(dayEnd)) conflicts.push("The schedule extends beyond the selected daily end time.");
  return conflicts;
}
