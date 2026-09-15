"use client";

import { useEffect, useMemo, useState } from "react";
import type { Place } from "@/lib/catalog/schema";
import { MapPanel } from "@/components/map/map-panel";
import { CatalogFilters, type CatalogFilterState, type CatalogFacets } from "./catalog-filters";
import { CatalogResults } from "./catalog-results";

const RESULTS_PER_PAGE = 12;

const INITIAL_FILTERS: CatalogFilterState = {
  query: "",
  city: "",
  type: "",
  tags: [],
  rating: "0",
  price: "",
  duration: "",
  booking: "",
  sort: "rating",
};

export function CatalogExplorer({ places, facets }: { places: Place[]; facets: CatalogFacets }) {
  const [filters, setFilters] = useState<CatalogFilterState>(INITIAL_FILTERS);
  const [showMap, setShowMap] = useState(false);
  const [visibleCount, setVisibleCount] = useState(RESULTS_PER_PAGE);

  const filtered = useMemo(() => {
    const search = filters.query.trim().toLowerCase();
    return places
      .filter((place) => {
        const searchable = [place.name, place.city, place.region, place.neighborhood, place.description, ...place.tags]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (!search || searchable.includes(search)) &&
          (!filters.city || place.city === filters.city) &&
          (!filters.type || place.type === filters.type) &&
          (!filters.tags.length || filters.tags.some((tag) => place.tags.includes(tag))) &&
          place.rating >= Number(filters.rating) &&
          (!filters.price || place.price_range === filters.price) &&
          (!filters.duration || (place.duration_minutes !== null && place.duration_minutes <= Number(filters.duration))) &&
          (!filters.booking ||
            (filters.booking === "required" && place.booking_required === true) ||
            (filters.booking === "not-required" && place.booking_required === false) ||
            (filters.booking === "unknown" && place.booking_required === null))
        );
      })
      .sort((a, b) => {
        if (filters.sort === "name") return a.name.localeCompare(b.name);
        if (filters.sort === "duration") {
          return (a.duration_minutes ?? Number.MAX_SAFE_INTEGER) - (b.duration_minutes ?? Number.MAX_SAFE_INTEGER);
        }
        return b.rating - a.rating;
      });
  }, [filters, places]);

  useEffect(() => setVisibleCount(RESULTS_PER_PAGE), [filters]);

  return (
    <section className="catalog-shell" aria-labelledby="catalog-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PLACE CATALOG</p>
          <h2 id="catalog-heading">Find your anchors</h2>
          <p>Start broad, then narrow the collection when you know what matters most.</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={() => setShowMap((value) => !value)}
          aria-pressed={showMap}
        >
          {showMap ? "Hide location overview" : "Show location overview"}
        </button>
      </div>
      <CatalogFilters
        facets={facets}
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters(INITIAL_FILTERS)}
      />
      <div className="results-toolbar">
        <p className="result-count" aria-live="polite">
          Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} places
        </p>
      </div>
      {showMap && <MapPanel places={filtered} />}
      <CatalogResults
        places={filtered.slice(0, visibleCount)}
        hasMore={visibleCount < filtered.length}
        onLoadMore={() => setVisibleCount((count) => count + RESULTS_PER_PAGE)}
      />
    </section>
  );
}
