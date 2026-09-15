import type { Place } from "@/lib/catalog/schema";
import type { TravelGap, TravelMode } from "./types";

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a: Pick<Place, "latitude" | "longitude">, b: Pick<Place, "latitude" | "longitude">): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function estimateTravelGap(from: Place, to: Place, mode: TravelMode = "walking"): TravelGap {
  const distanceKm = haversineKm(from, to);
  const speeds: Record<TravelMode, number> = { walking: 4.5, transit: 18, driving: 28 };
  return {
    distanceKm: Number(distanceKm.toFixed(1)),
    minutes: Math.max(5, Math.ceil((distanceKm / speeds[mode]) * 60)),
    mode,
    source: "heuristic",
  };
}
