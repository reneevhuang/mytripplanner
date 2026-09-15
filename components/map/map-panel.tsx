"use client";

import type { Place } from "@/lib/catalog/schema";

export function MapPanel({ places }: { places: Place[] }) {
  const visible = places.slice(0, 40);
  if (!visible.length) return <div className="map-empty">No places match the current filters.</div>;
  const lats = visible.map((place) => place.latitude);
  const lngs = visible.map((place) => place.longitude);
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);

  return (
    <div className="map-panel" role="img" aria-label={`Location overview showing ${visible.length} filtered places`}>
      <div className="map-grid" aria-hidden="true">
        {visible.map((place) => {
          const left = ((place.longitude - minLng) / Math.max(maxLng - minLng, 0.01)) * 88 + 6;
          const top = (1 - (place.latitude - minLat) / Math.max(maxLat - minLat, 0.01)) * 78 + 11;
          return <span className="map-dot" key={place.id} style={{ left: `${left}%`, top: `${top}%` }} title={`${place.name}, ${place.city}`} />;
        })}
      </div>
      <p>Location overview · approximate positions for comparing the current results.</p>
    </div>
  );
}
