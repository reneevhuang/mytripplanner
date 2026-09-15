import source from "../italy.json";
import { normalizeCatalog } from "../lib/catalog/normalize";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");

const places = normalizeCatalog(source);
const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates",
};

async function request(path: string, body: unknown) {
  const response = await fetch(`${url}/rest/v1/${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path} import failed: ${response.status} ${await response.text()}`);
}

async function query<T>(path: string): Promise<T> {
  const response = await fetch(`${url}/rest/v1/${path}`, { headers });
  if (!response.ok) throw new Error(`${path} query failed: ${response.status} ${await response.text()}`);
  return response.json() as Promise<T>;
}

const placeRows = places.map((place) => ({
  source_id: place.id,
  name: place.name,
  type: place.type,
  city: place.city,
  region: place.region,
  neighborhood: place.neighborhood,
  description: place.description,
  latitude: place.latitude,
  longitude: place.longitude,
  hours_raw: place.hours,
  hours_status: place.hoursStatus,
  duration_minutes: place.duration_minutes,
  price_range: place.price_range,
  rating: place.rating,
  booking_required: place.booking_required,
  seasonal_notes: place.seasonal_notes,
  source_record: source.find((record) => record.id === place.id),
}));
const tagRows = [...new Set(places.flatMap((place) => place.tags))].map((slug) => ({
  slug,
  display_label: slug.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
}));

await request("places?on_conflict=source_id", placeRows);
await request("tags?on_conflict=slug", tagRows);
const storedPlaces = await query<Array<{ id: string; source_id: string }>>("places?select=id,source_id");
const storedTags = await query<Array<{ id: string; slug: string }>>("tags?select=id,slug");
const placeIds = new Map(storedPlaces.map((place) => [place.source_id, place.id]));
const tagIds = new Map(storedTags.map((tag) => [tag.slug, tag.id]));
const placeTags = places.flatMap((place) =>
  place.tags.map((tag) => ({ place_id: placeIds.get(place.id), tag_id: tagIds.get(tag) })),
);
if (placeTags.some((row) => !row.place_id || !row.tag_id)) throw new Error("Imported place/tag IDs could not be resolved.");
await request("place_tags?on_conflict=place_id,tag_id", placeTags);

const issues = places.flatMap((place) =>
  place.importWarnings.map((message) => ({
    place_id: placeIds.get(place.id),
    source_id: place.id,
    severity: "warning",
    code: message.toLowerCase().replace(/\W+/g, "_").replace(/^_|_$/g, ""),
    message,
  })),
);
if (issues.length) await request("place_import_issues", issues);
console.log(`Imported ${placeRows.length} places, ${tagRows.length} tags, ${placeTags.length} links, and ${issues.length} warnings.`);
