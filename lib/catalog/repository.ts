import catalogSource from "@/italy.json";
import { normalizeCatalog, normalizePlace } from "./normalize";
import type { Place, RawPlace } from "./schema";

interface SupabaseTagRow {
  slug: string;
  display_label: string;
}

interface SupabasePlaceTagRow {
  tags: SupabaseTagRow | null;
}

interface SupabaseImportIssueRow {
  message: string;
}

interface SupabasePlaceRow {
  source_id: string;
  name: string;
  type: string;
  city: string;
  region: string;
  neighborhood: string | null;
  description: string;
  latitude: number;
  longitude: number;
  hours_raw: string | null;
  duration_minutes: number | null;
  price_range: RawPlace["price_range"];
  rating: number | string;
  booking_required: boolean | null;
  seasonal_notes: string | null;
  place_tags?: SupabasePlaceTagRow[];
  place_import_issues?: SupabaseImportIssueRow[];
}

let cachedCatalog: Place[] | null = null;
let cachedSupabaseCatalog: Place[] | null = null;

export function getPlaces(): Place[] {
  cachedCatalog ??= normalizeCatalog(catalogSource);
  return cachedCatalog;
}

export function getPlace(id: string): Place | undefined {
  return getPlaces().find((place) => place.id === id);
}

export function getCatalogFacets() {
  return getCatalogFacetsForPlaces(getPlaces());
}

export function getCatalogFacetsForPlaces(places: Place[]) {
  return {
    cities: [...new Set(places.map((place) => place.city))].sort(),
    regions: [...new Set(places.map((place) => place.region))].sort(),
    types: [...new Set(places.map((place) => place.type))].sort(),
    tags: [...new Set(places.flatMap((place) => place.tags))].sort(),
  };
}

function mapSupabasePlace(row: SupabasePlaceRow): Place {
  const tags = row.place_tags
    ?.map((link) => link.tags?.slug)
    .filter((tag): tag is string => Boolean(tag)) ?? [];
  const raw: RawPlace = {
    id: row.source_id,
    name: row.name,
    type: row.type,
    city: row.city,
    region: row.region,
    neighborhood: row.neighborhood,
    description: row.description,
    latitude: row.latitude,
    longitude: row.longitude,
    hours: row.hours_raw,
    duration_minutes: row.duration_minutes,
    price_range: row.price_range,
    rating: Number(row.rating),
    tags,
    seasonal_notes: row.seasonal_notes,
    booking_required: row.booking_required,
  };
  const normalized = normalizePlace(raw);
  const importWarnings = [
    ...normalized.importWarnings,
    ...(row.place_import_issues?.map((issue) => issue.message) ?? []),
  ];
  return { ...normalized, importWarnings: [...new Set(importWarnings)] };
}

async function fetchSupabaseCatalog(): Promise<Place[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const select = [
    "source_id",
    "name",
    "type",
    "city",
    "region",
    "neighborhood",
    "description",
    "latitude",
    "longitude",
    "hours_raw",
    "duration_minutes",
    "price_range",
    "rating",
    "booking_required",
    "seasonal_notes",
    "place_tags(tags(slug,display_label))",
    "place_import_issues(message)",
  ].join(",");
  const response = await fetch(`${url}/rest/v1/places?select=${select}&order=name.asc`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    throw new Error(`Supabase catalog query failed: ${response.status} ${await response.text()}`);
  }
  const rows = await response.json() as SupabasePlaceRow[];
  return rows.map(mapSupabasePlace);
}

export async function loadPlaces(): Promise<Place[]> {
  if (cachedSupabaseCatalog) return cachedSupabaseCatalog;
  try {
    const supabaseCatalog = await fetchSupabaseCatalog();
    if (supabaseCatalog) {
      cachedSupabaseCatalog = supabaseCatalog;
      return cachedSupabaseCatalog;
    }
  } catch (error) {
    console.error(error);
  }
  return getPlaces();
}

export async function loadPlace(id: string): Promise<Place | undefined> {
  return (await loadPlaces()).find((place) => place.id === id);
}
