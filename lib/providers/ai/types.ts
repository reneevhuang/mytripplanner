import type { Itinerary } from "@/lib/planner/types";

export interface ItineraryPatch {
  notice: string;
  stopNotes?: Record<string, string>;
}

export interface ItineraryRefiner {
  refine(itinerary: Itinerary): Promise<ItineraryPatch>;
}

// Represents retryable or permanent errors from a future AI itinerary refiner.
export class RefinerError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}