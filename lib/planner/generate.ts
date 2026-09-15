import { addDays, eachDayOfInterval, formatISO, isAfter, parseISO } from "date-fns";
import { minutesFromTime, roundUpToHalfHour, timeFromMinutes } from "@/lib/catalog/hours";
import type { Place } from "@/lib/catalog/schema";
import { findDayConflicts } from "./conflicts";
import { estimateTravelGap, haversineKm } from "./proximity";
import { scorePlace } from "./scoring";
import type { CityAllocation, Itinerary, ItineraryDay, ItineraryStop, TripInput } from "./types";

export const DEFAULT_DURATION_MINUTES = 75;
const MAX_STOPS = { relaxed: 3, balanced: 5, full: 7 } as const;

function validateInput(input: TripInput): void {
  const start = parseISO(input.startDate);
  const end = parseISO(input.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || isAfter(start, end)) {
    throw new Error("Trip dates are invalid.");
  }
  if (!input.cityAllocations.length) throw new Error("At least one city allocation is required.");
  if (minutesFromTime(input.dayStart) >= minutesFromTime(input.dayEnd)) {
    throw new Error("Daily start time must be before the end time.");
  }
  for (const allocation of input.cityAllocations) {
    if (
      allocation.startDate > allocation.endDate ||
      allocation.startDate < input.startDate ||
      allocation.endDate > input.endDate
    ) {
      throw new Error(`The ${allocation.city} allocation falls outside the trip dates.`);
    }
  }
  for (const date of eachDayOfInterval({ start, end }).map((value) => formatISO(value, { representation: "date" }))) {
    const matches = input.cityAllocations.filter((allocation) => date >= allocation.startDate && date <= allocation.endDate);
    if (matches.length !== 1) throw new Error(`Assign exactly one city to ${date}.`);
  }
}

function allocationForDate(date: string, allocations: CityAllocation[]): CityAllocation | undefined {
  return allocations.find((allocation) => date >= allocation.startDate && date <= allocation.endDate);
}

function warningsFor(place: Place, startMinutes: number, durationMinutes: number): string[] {
  const warnings: string[] = [];
  if (place.booking_required === true) warnings.push("Advance booking recommended.");
  if (place.booking_required === null) warnings.push("Booking requirement is unknown.");
  if (place.seasonal_notes) warnings.push(place.seasonal_notes);
  if (place.duration_minutes === null) warnings.push(`Duration estimated at ${DEFAULT_DURATION_MINUTES} minutes.`);
  if (place.hoursStatus !== "parsed") {
    warnings.push(place.hours ? "Opening hours are unverified." : "Opening hours are unavailable.");
  } else if (
    place.parsedHours &&
    (startMinutes < place.parsedHours.openMinutes || startMinutes + durationMinutes > place.parsedHours.closeMinutes)
  ) {
    warnings.push("Scheduled outside the confidently parsed opening window.");
  }
  return warnings;
}

function orderByProximity(candidates: Place[]): Place[] {
  if (candidates.length < 2) return candidates;
  const remaining = [...candidates];
  const ordered = [remaining.shift()!];
  while (remaining.length) {
    const previous = ordered.at(-1)!;
    remaining.sort((a, b) => haversineKm(previous, a) - haversineKm(previous, b));
    ordered.push(remaining.shift()!);
  }
  return ordered;
}

function buildDay(date: string, city: string, places: Place[], input: TripInput, used: Set<string>): ItineraryDay {
  const available = places
    .filter((place) => place.city === city && !used.has(place.id))
    .sort((a, b) => scorePlace(b, input) - scorePlace(a, input));
  const selected = orderByProximity(available.slice(0, MAX_STOPS[input.pace]));
  const stops: ItineraryStop[] = [];
  let cursor = minutesFromTime(input.dayStart);
  const end = minutesFromTime(input.dayEnd);

  for (const place of selected) {
    const durationMinutes = place.duration_minutes ?? DEFAULT_DURATION_MINUTES;
    const gap = stops.length ? estimateTravelGap(stops.at(-1)!.place, place) : null;
    const startMinutes = roundUpToHalfHour(cursor + (gap?.minutes ?? 0));
    if (startMinutes + durationMinutes > end && stops.length) continue;

    used.add(place.id);
    stops.push({
      id: `${date}-${place.id}`,
      placeId: place.id,
      place,
      startTime: timeFromMinutes(startMinutes),
      durationMinutes,
      durationEstimated: place.duration_minutes === null,
      locked: false,
      notes: "",
      warnings: warningsFor(place, startMinutes, durationMinutes),
      travelFromPrevious: gap,
    });
    cursor = startMinutes + durationMinutes;
  }

  const day: ItineraryDay = { date, city, notes: "", stops, warnings: [] };
  day.warnings = findDayConflicts(day, input.dayEnd);
  if (!stops.length) day.warnings.push("No eligible places fit this day.");
  return day;
}

export function generateItinerary(input: TripInput, places: Place[], now = new Date()): Itinerary {
  validateInput(input);
  const dates = eachDayOfInterval({ start: parseISO(input.startDate), end: parseISO(input.endDate) });
  const used = new Set<string>();
  const days = dates.map((dateValue) => {
    const date = formatISO(dateValue, { representation: "date" });
    const allocation = allocationForDate(date, input.cityAllocations)!;
    return buildDay(date, allocation.city, places, input, used);
  });
  const timestamp = now.toISOString();

  return {
    id: `trip-${now.getTime()}`,
    version: 1,
    input,
    days,
    createdAt: timestamp,
    updatedAt: timestamp,
    warnings: days.some((day) => day.stops.some((stop) => stop.travelFromPrevious?.source === "heuristic"))
      ? ["Travel times use straight-line estimates until a routing provider is configured."]
      : [],
  };
}

export function nextDate(date: string): string {
  return formatISO(addDays(parseISO(date), 1), { representation: "date" });
}
