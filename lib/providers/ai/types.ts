import type { Itinerary } from "@/lib/planner/types";

export interface ItineraryPatch {
  notice: string;
  stopNotes?: Record<string, string>;
}

export interface ItineraryRefiner {
  refine(itinerary: Itinerary): Promise<ItineraryPatch>;
}

export class RefinerError extends Error {
  constructor(message: string, readonly retryable: boolean) {
    super(message);
  }
}
