"use client";

import Link from "next/link";
import { useState } from "react";
import type { Place } from "@/lib/catalog/schema";
import { formatDuration } from "@/lib/format-duration";

export function CatalogResults({
  places,
  hasMore,
  onLoadMore,
}: {
  places: Place[];
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!places.length) {
    return <div className="empty-results"><h3>No matching places</h3><p>Try removing a filter or choosing a nearby city.</p></div>;
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>City</th><th>Type</th><th>Rating</th><th>Price</th><th>Duration</th><th>Booking</th></tr>
          </thead>
          <tbody>
            {places.map((place) => {
              const expanded = expandedId === place.id;
              return (
                <FragmentRow
                  expanded={expanded}
                  key={place.id}
                  place={place}
                  onToggle={() => setExpandedId(expanded ? null : place.id)}
                />
              );
            })}
          </tbody>
        </table>
      </div>
      {hasMore && <button className="button button-secondary load-more" type="button" onClick={onLoadMore}>Load more places</button>}
    </>
  );
}

function FragmentRow({ place, expanded, onToggle }: { place: Place; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className={expanded ? "catalog-row expanded" : "catalog-row"}>
        <td data-label="Name">
          <Link className="place-link" href={`/places/${place.id}`}>{place.name}</Link>
          <button className="row-details-toggle" type="button" onClick={onToggle} aria-expanded={expanded}>
            {expanded ? "Hide details" : "Quick details"}
          </button>
        </td>
        <td data-label="City">{place.city}</td>
        <td data-label="Type">{place.type.replaceAll("_", " ")}</td>
        <td data-label="Rating"><strong>{place.rating.toFixed(1)}★</strong></td>
        <td data-label="Price">{place.price_range}</td>
        <td data-label="Duration">{formatDuration(place.duration_minutes)}</td>
        <td data-label="Booking">{place.booking_required === null ? "Unknown" : place.booking_required ? "Yes" : "No"}</td>
      </tr>
      {expanded && (
        <tr className="expanded-details">
          <td colSpan={7}>
            <div>
              <p><strong>Neighborhood</strong><span>{place.neighborhood ?? "Not specified"}</span></p>
              <p><strong>Hours</strong><span>{place.hours ?? "Unknown"}</span></p>
              <p><strong>Tags</strong><span>{place.tags.slice(0, 5).join(", ")}</span></p>
              <Link href={`/places/${place.id}`}>View full place details →</Link>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
