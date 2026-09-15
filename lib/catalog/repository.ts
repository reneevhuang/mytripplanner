import catalogSource from "@/italy.json";
import { normalizeCatalog } from "./normalize";
import type { Place } from "./schema";

let cachedCatalog: Place[] | null = null;

export function getPlaces(): Place[] {
  cachedCatalog ??= normalizeCatalog(catalogSource);
  return cachedCatalog;
}

export function getPlace(id: string): Place | undefined {
  return getPlaces().find((place) => place.id === id);
}

export function getCatalogFacets() {
  const places = getPlaces();
  return {
    cities: [...new Set(places.map((place) => place.city))].sort(),
    regions: [...new Set(places.map((place) => place.region))].sort(),
    types: [...new Set(places.map((place) => place.type))].sort(),
    tags: [...new Set(places.flatMap((place) => place.tags))].sort(),
  };
}
