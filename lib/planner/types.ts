import type { Place, PriceRange } from "@/lib/catalog/schema";

export type Pace = "relaxed" | "balanced" | "full";
export type TravelParty = "solo" | "couple" | "family" | "friends";
export type TravelMode = "walking" | "transit" | "driving";

export interface CityAllocation {
  city: string;
  startDate: string;
  endDate: string;
}

export interface TripInput {
  name: string;
  startDate: string;
  endDate: string;
  cityAllocations: CityAllocation[];
  dayStart: string;
  dayEnd: string;
  interests: string[];
  budget: PriceRange | "any";
  pace: Pace;
  party: TravelParty;
}

export interface TravelGap {
  minutes: number;
  distanceKm: number;
  mode: TravelMode;
  source: "heuristic" | "amazon-location" | "azure-maps";
}

export interface ItineraryStop {
  id: string;
  placeId: string;
  place: Place;
  startTime: string;
  durationMinutes: number;
  durationEstimated: boolean;
  locked: boolean;
  notes: string;
  warnings: string[];
  travelFromPrevious: TravelGap | null;
}

export interface ItineraryDay {
  date: string;
  city: string;
  notes: string;
  stops: ItineraryStop[];
  warnings: string[];
}

export interface Itinerary {
  id: string;
  version: 1;
  input: TripInput;
  days: ItineraryDay[];
  createdAt: string;
  updatedAt: string;
  warnings: string[];
}
