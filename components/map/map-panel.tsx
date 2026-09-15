"use client";

import type { Place } from "@/lib/catalog/schema";

interface MapPanelProps {
  places: Place[];
  title?: string;
  description?: string;
  ordered?: boolean;
}

export function MapPanel({
  places,
  title = "Location overview",
  description = "Coordinate map for comparing the current results.",
  ordered = false,
}: MapPanelProps) {
  const visible = places.slice(0, 60);
  if (!visible.length) return <div className="map-empty">No places match the current filters.</div>;
  const lats = visible.map((place) => place.latitude);
  const lngs = visible.map((place) => place.longitude);
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
  const project = (place: Place) => {
    const x = ((place.longitude - minLng) / Math.max(maxLng - minLng, 0.01)) * 88 + 6;
    const y = (1 - (place.latitude - minLat) / Math.max(maxLat - minLat, 0.01)) * 78 + 11;
    return { x, y };
  };
  const routePoints = ordered ? visible.map((place) => {
    const point = project(place);
    return `${point.x},${point.y}`;
  }).join(" ") : "";

  return (
    <div className="map-panel" aria-label={`${title} showing ${visible.length} places`}>
      <div className="map-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span>{visible.length} shown</span>
      </div>
      <svg className="coordinate-map" role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="map-grid-pattern" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" />
          </pattern>
        </defs>
        <rect className="map-water" width="100" height="100" />
        <rect className="map-grid-lines" width="100" height="100" fill="url(#map-grid-pattern)" />
        {routePoints && <polyline className="map-route-line" points={routePoints} />}
        {visible.map((place, index) => {
          const point = project(place);
          return (
            <g className="map-marker" key={`${place.id}-${index}`} transform={`translate(${point.x} ${point.y})`}>
              <circle r={ordered ? 2.5 : 1.8} />
              {ordered && <text y=".45" textAnchor="middle">{index + 1}</text>}
              <title>{place.name}, {place.city}</title>
            </g>
          );
        })}
      </svg>
      <ol className="map-place-list">
        {visible.slice(0, 8).map((place, index) => (
          <li key={`${place.id}-list-${index}`}>
            {ordered && <span>{index + 1}</span>}
            <strong>{place.name}</strong>
            <em>{place.city}</em>
          </li>
        ))}
      </ol>
    </div>
  );
}
