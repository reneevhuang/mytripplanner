import type { Place } from "@/lib/catalog/schema";
import type { TravelGap, TravelMode } from "@/lib/planner/types";

export type RouteLocation = Pick<Place, "latitude" | "longitude">;

export interface MapProvider {
  route(from: RouteLocation, to: RouteLocation, mode: TravelMode): Promise<TravelGap>;
}

export class MapProviderError extends Error {
  constructor(
    message: string,
    readonly code: "not-configured" | "unsupported-mode" | "provider-failure",
  ) {
    super(message);
  }
}
