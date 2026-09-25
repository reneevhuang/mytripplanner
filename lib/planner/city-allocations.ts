import { eachDayOfInterval, formatISO, isAfter, parseISO } from "date-fns";
import type { CityAllocation } from "./types";

// Expands a start/end date pair into every ISO date inside the range.
export function datesInRange(startDate: string, endDate: string): string[] {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || isAfter(start, end)) return [];

  return eachDayOfInterval({ start, end }).map((date) => formatISO(date, { representation: "date" }));
}

// Deduplicates dates and keeps city rows ordered by their first selected date.
export function sortCityAllocations(allocations: CityAllocation[]): CityAllocation[] {
  return allocations
    .map((allocation) => ({ ...allocation, dates: [...new Set(allocation.dates)].sort() }))
    .sort((left, right) => (left.dates[0] ?? "9999-12-31").localeCompare(right.dates[0] ?? "9999-12-31"));
}