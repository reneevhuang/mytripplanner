import { addDays, eachDayOfInterval, formatISO, isAfter, parseISO } from "date-fns";
import { minutesFromTime, roundUpToHalfHour, timeFromMinutes } from "@/lib/catalog/hours";
import type { Place } from "@/lib/catalog/schema";
import { formatDuration } from "@/lib/format-duration";
import { findDayConflicts } from "./conflicts";
import { datesInRange } from "./city-allocations";
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
    if (!allocation.dates.length || allocation.dates.some((date) => date < input.startDate || date > input.endDate)) {
      throw new Error(`The ${allocation.city} allocation falls outside the trip dates.`);
    }
  }
  for (const date of datesInRange(input.startDate, input.endDate)) {
    const matches = input.cityAllocations.filter((allocation) => allocation.dates.includes(date));
    if (!matches.length) throw new Error(`Choose at least one city for ${date}.`);
  }
}

function allocationsForDate(date: string, allocations: CityAllocation[]): CityAllocation[] {
  return allocations.filter((allocation) => allocation.dates.includes(date));
}

function warningsFor(place: Place, startMinutes: number, durationMinutes: number): string[] {
  const warnings: string[] = [];
  if (place.booking_required === true) warnings.push("Advance booking recommended.");
  if (place.booking_required === null) warnings.push("Booking requirement is unknown.");
  if (place.seasonal_notes) warnings.push(place.seasonal_notes);
  if (place.duration_minutes === null) warnings.push(`Time there estimated at ${formatDuration(DEFAULT_DURATION_MINUTES)}.`);
  if (
    place.hoursStatus === "parsed" &&
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

function buildDay(date: string, cities: string[], places: Place[], input: TripInput, used: Set<string>): ItineraryDay {
  const selected: Place[] = [];
  let remainingSlots = MAX_STOPS[input.pace];

  cities.forEach((city, cityIndex) => {
    if (!remainingSlots) return;
    const available = places
      .filter((place) => place.city === city && !used.has(place.id))
      .sort((a, b) => scorePlace(b, input) - scorePlace(a, input));
    const remainingCities = cities.length - cityIndex;
    const cityLimit = Math.max(1, Math.ceil(remainingSlots / remainingCities));
    const cityPlaces = orderByProximity(available.slice(0, cityLimit));
    selected.push(...cityPlaces);
    remainingSlots -= cityPlaces.length;
  });

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

  const day: ItineraryDay = { date, city: cities.join(" → "), notes: "", stops, warnings: [] };
  day.warnings = findDayConflicts(day, input.dayEnd);
  if (!stops.length) day.warnings.push("No eligible places fit this day.");
  else cities
    .filter((city) => !stops.some((stop) => stop.place.city === city))
    .forEach((city) => day.warnings.push(`No eligible places fit for ${city}.`));
  return day;
}

export function generateItinerary(input: TripInput, places: Place[], now = new Date()): Itinerary {
  validateInput(input);
  const dates = eachDayOfInterval({ start: parseISO(input.startDate), end: parseISO(input.endDate) });
  const used = new Set<string>();
  const days = dates.map((dateValue) => {
    const date = formatISO(dateValue, { representation: "date" });
    const allocations = allocationsForDate(date, input.cityAllocations);
    const cities = [...new Set(allocations.map((allocation) => allocation.city))];
    return buildDay(date, cities, places, input, used);
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
