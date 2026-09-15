import { parseSimpleHours } from "./hours";
import { rawCatalogSchema, type Place, type RawPlace } from "./schema";

const TAG_ALIASES: Record<string, string> = {
  local_favorite: "local-favorite",
  rainy_day: "rainy-day",
  hidden_gem: "hidden-gem",
  tourist_heavy: "tourist-heavy",
};

export function normalizeTag(tag: string): string {
  const slug = tag.trim().toLowerCase().replace(/\s+/g, "-");
  return TAG_ALIASES[slug] ?? slug.replaceAll("_", "-");
}

function displayTag(tag: string): string {
  return tag.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function coordinateWarning(place: RawPlace): string | null {
  const italyBounds = { minLat: 35.4, maxLat: 47.2, minLng: 6.4, maxLng: 18.7 };
  if (
    place.latitude < italyBounds.minLat ||
    place.latitude > italyBounds.maxLat ||
    place.longitude < italyBounds.minLng ||
    place.longitude > italyBounds.maxLng
  ) {
    return "Coordinates fall outside broad Italy bounds.";
  }
  return null;
}

export function normalizePlace(place: RawPlace): Place {
  const tags = [...new Set(place.tags.map(normalizeTag))].sort();
  const parsedHours = parseSimpleHours(place.hours);
  const importWarnings = [
    !place.hours ? "Opening hours are unavailable." : parsedHours ? null : "Opening hours could not be parsed confidently.",
    place.duration_minutes === null ? "Visit duration is unknown and will be estimated by the planner." : null,
    place.booking_required === null ? "Booking requirement is unresolved." : null,
    coordinateWarning(place),
  ].filter((warning): warning is string => Boolean(warning));

  return {
    ...place,
    tags,
    tagLabels: tags.map(displayTag),
    parsedHours,
    hoursStatus: !place.hours ? "unavailable" : parsedHours ? "parsed" : "unknown",
    importWarnings,
  };
}

export function normalizeCatalog(input: unknown): Place[] {
  const parsed = rawCatalogSchema.parse(input);
  const ids = new Set<string>();

  return parsed.map((place) => {
    if (ids.has(place.id)) throw new Error(`Duplicate place ID: ${place.id}`);
    ids.add(place.id);
    return normalizePlace(place);
  });
}
