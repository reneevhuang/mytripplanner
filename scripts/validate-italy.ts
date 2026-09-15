import source from "../italy.json";
import { haversineKm } from "../lib/planner/proximity";
import { normalizeCatalog } from "../lib/catalog/normalize";

const places = normalizeCatalog(source);
const warnings = places.flatMap((place) => place.importWarnings.map((warning) => ({ id: place.id, warning })));
const coordinateWarnings: Array<{ id: string; warning: string }> = [];

for (const city of new Set(places.map((place) => place.city))) {
  const cityPlaces = places.filter((place) => place.city === city);
  const center = {
    latitude: cityPlaces.reduce((sum, place) => sum + place.latitude, 0) / cityPlaces.length,
    longitude: cityPlaces.reduce((sum, place) => sum + place.longitude, 0) / cityPlaces.length,
  };
  for (const place of cityPlaces) {
    const distance = haversineKm(place, center);
    if (distance > 80) coordinateWarnings.push({ id: place.id, warning: `Coordinates are ${distance.toFixed(0)} km from the ${city} catalog center.` });
  }
}

const cities = new Set(places.map((place) => place.city));
const regions = new Set(places.map((place) => place.region));
console.log(`Validated ${places.length} places across ${cities.size} cities and ${regions.size} regions.`);
console.log(`Warnings: ${warnings.length + coordinateWarnings.length}`);
for (const issue of [...warnings, ...coordinateWarnings]) console.log(`- ${issue.id}: ${issue.warning}`);
