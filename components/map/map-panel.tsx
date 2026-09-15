"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const visible = useMemo(() => places.slice(0, 60), [places]);
  const lats = visible.map((place) => place.latitude);
  const lngs = visible.map((place) => place.longitude);
  const minLat = lats.length ? Math.min(...lats) : 0; const maxLat = lats.length ? Math.max(...lats) : 0;
  const minLng = lngs.length ? Math.min(...lngs) : 0; const maxLng = lngs.length ? Math.max(...lngs) : 0;
  const project = (place: Place) => {
    const x = ((place.longitude - minLng) / Math.max(maxLng - minLng, 0.01)) * 88 + 6;
    const y = (1 - (place.latitude - minLat) / Math.max(maxLat - minLat, 0.01)) * 78 + 11;
    return { x, y };
  };
  const routePoints = ordered ? visible.map((place) => {
    const point = project(place);
    return `${point.x},${point.y}`;
  }).join(" ") : "";
  const bounds = useMemo(() => ({ minLat, maxLat, minLng, maxLng }), [minLat, maxLat, minLng, maxLng]);

  useEffect(() => {
    if (!visible.length) return;
    const container = mapContainerRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanup = () => {};

    import("maplibre-gl")
      .then((maplibre) => {
        if (cancelled || !mapContainerRef.current) return;
        let map: InstanceType<typeof maplibre.Map>;
        try {
          map = new maplibre.Map({
            container: mapContainerRef.current,
            style: "/api/maps/style?v=2",
            center: [(bounds.minLng + bounds.maxLng) / 2, (bounds.minLat + bounds.maxLat) / 2],
            zoom: bounds.maxLng - bounds.minLng > 4 ? 5 : 11,
            attributionControl: { compact: true },
          });
        } catch {
          setMapFailed(true);
          return;
        }
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

        const markers = visible.map((place, index) => {
          const marker = document.createElement("button");
          marker.className = "real-map-marker";
          marker.type = "button";
          marker.textContent = ordered ? String(index + 1) : "";
          marker.title = `${place.name}, ${place.city}`;
          const popupContent = document.createElement("div");
          const popupTitle = document.createElement("strong");
          popupTitle.textContent = place.name;
          const popupCity = document.createElement("span");
          popupCity.textContent = place.city;
          popupContent.append(popupTitle, document.createElement("br"), popupCity);
          return new maplibre.Marker({ element: marker })
            .setLngLat([place.longitude, place.latitude])
            .setPopup(new maplibre.Popup({ offset: 16 }).setDOMContent(popupContent))
            .addTo(map);
        });

        map.once("load", () => {
          if (visible.length > 1) {
            map.fitBounds(
              [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
              { padding: 60, maxZoom: ordered ? 13 : 7 },
            );
          } else {
            map.setZoom(13);
          }
          if (ordered && visible.length > 1) {
            map.addSource("itinerary-route", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: visible.map((place) => [place.longitude, place.latitude]),
                },
              },
            });
            map.addLayer({
              id: "itinerary-route-line",
              type: "line",
              source: "itinerary-route",
              paint: { "line-color": "#1f5a45", "line-width": 3, "line-opacity": 0.8 },
            });
          }
        });
        cleanup = () => {
          markers.forEach((marker) => marker.remove());
          map.remove();
        };
      })
      .catch(() => setMapFailed(true));

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [bounds, ordered, visible]);

  if (!visible.length) return <div className="map-empty">No places match the current filters.</div>;

  return (
    <div className="map-panel" aria-label={`${title} showing ${visible.length} places`}>
      <div className="map-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span>{visible.length} shown</span>
      </div>
      {!mapFailed && <div className="real-map" ref={mapContainerRef} />}
      {mapFailed && <p className="notice notice-muted">Amazon Location map tiles are unavailable, so this fallback coordinate view is shown.</p>}
      <svg className={mapFailed ? "coordinate-map" : "coordinate-map coordinate-map-fallback"} role="img" viewBox="0 0 100 100" preserveAspectRatio="none">
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
