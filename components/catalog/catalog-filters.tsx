"use client";

import type { CSSProperties, Dispatch, SetStateAction } from "react";

export interface CatalogFacets {
  cities: string[];
  regions: string[];
  types: string[];
  tags: string[];
}

export interface CatalogFilterState {
  query: string;
  city: string;
  type: string;
  tags: string[];
  rating: string;
  price: string;
  duration: string;
  booking: string;
  sort: string;
}

interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

export function CatalogFilters({
  facets,
  filters,
  onChange,
  onReset,
}: {
  facets: CatalogFacets;
  filters: CatalogFilterState;
  onChange: Dispatch<SetStateAction<CatalogFilterState>>;
  onReset: () => void;
}) {
  const update = (key: Exclude<keyof CatalogFilterState, "tags">, value: string) => {
    onChange((current) => ({ ...current, [key]: value }));
  };
  const toggleTag = (tag: string) => {
    onChange((current) => ({
      ...current,
      tags: current.tags.includes(tag) ? current.tags.filter((value) => value !== tag) : [...current.tags, tag],
    }));
  };
  const chips: FilterChip[] = [
    filters.query ? { id: "query", label: `Search: ${filters.query}`, onRemove: () => update("query", "") } : null,
    filters.city ? { id: "city", label: filters.city, onRemove: () => update("city", "") } : null,
    filters.type ? { id: "type", label: filters.type.replaceAll("_", " "), onRemove: () => update("type", "") } : null,
    ...filters.tags.map((tag) => ({
      id: `tag-${tag}`,
      label: tag.replaceAll("-", " "),
      onRemove: () => toggleTag(tag),
    })),
    filters.rating !== "0" ? { id: "rating", label: `${Number(filters.rating).toFixed(1)}★+`, onRemove: () => update("rating", "0") } : null,
    filters.price ? { id: "price", label: filters.price, onRemove: () => update("price", "") } : null,
    filters.duration ? { id: "duration", label: `≤ ${filters.duration} min`, onRemove: () => update("duration", "") } : null,
    filters.booking ? { id: "booking", label: filters.booking.replaceAll("-", " "), onRemove: () => update("booking", "") } : null,
  ].filter((chip): chip is FilterChip => chip !== null);
  const ratingStyle = { "--rating-progress": `${Number(filters.rating) * 20}%` } as CSSProperties;

  return (
    <div className="filter-panel">
      <div className="primary-filters">
        <label className="field field-wide">
          Search
          <input
            value={filters.query}
            onChange={(event) => update("query", event.target.value)}
            placeholder="Museum, food, hidden gem…"
            type="search"
          />
        </label>
        <label className="field">
          City
          <select value={filters.city} onChange={(event) => update("city", event.target.value)}>
            <option value="">All cities</option>
            {facets.cities.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">
          Type
          <select value={filters.type} onChange={(event) => update("type", event.target.value)}>
            <option value="">All types</option>
            {facets.types.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
        </label>
      </div>
      <details className="more-filters">
        <summary>More filters</summary>
        <div className="secondary-filters">
          <fieldset className="tag-filter">
            <legend>Tags <span>match any selected</span></legend>
            <div className="tag-filter-grid">
              {facets.tags.map((tag) => {
                const checked = filters.tags.includes(tag);
                return (
                  <label className={checked ? "selected" : ""} key={tag}>
                    <input checked={checked} onChange={() => toggleTag(tag)} type="checkbox" />
                    <span aria-hidden="true">{checked ? "✓" : "+"}</span>
                    {tag.replaceAll("-", " ")}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label className="rating-filter">
            <span>
              Minimum rating
              <output htmlFor="minimum-rating">{filters.rating === "0" ? "Any" : `${Number(filters.rating).toFixed(1)}★+`}</output>
            </span>
            <input
              aria-valuetext={filters.rating === "0" ? "Any rating" : `${Number(filters.rating).toFixed(1)} stars or higher`}
              id="minimum-rating"
              list="rating-marks"
              max="5"
              min="0"
              onChange={(event) => update("rating", event.target.value)}
              step="0.5"
              style={ratingStyle}
              type="range"
              value={filters.rating}
            />
            <datalist id="rating-marks">
              {[0, 1, 2, 3, 4, 5].map((value) => <option key={value} value={value} />)}
            </datalist>
            <span className="rating-scale" aria-hidden="true"><span>Any</span><span>5★</span></span>
          </label>
          <label className="field">
            Price
            <select value={filters.price} onChange={(event) => update("price", event.target.value)}>
              <option value="">Any price</option>
              {["€", "€€", "€€€", "€€€€"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="field">
            Max duration
            <select value={filters.duration} onChange={(event) => update("duration", event.target.value)}>
              <option value="">Any duration</option>
              <option value="60">60 min</option>
              <option value="120">2 hours</option>
              <option value="240">4 hours</option>
            </select>
          </label>
          <label className="field">
            Booking
            <select value={filters.booking} onChange={(event) => update("booking", event.target.value)}>
              <option value="">Any</option>
              <option value="required">Required</option>
              <option value="not-required">Not required</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label className="field">
            Sort
            <select value={filters.sort} onChange={(event) => update("sort", event.target.value)}>
              <option value="rating">Highest rated</option>
              <option value="name">Name</option>
              <option value="duration">Shortest visit</option>
            </select>
          </label>
        </div>
      </details>
      {chips.length > 0 && (
        <div className="active-filters" aria-label="Active filters">
          {chips.map((chip) => (
            <button key={chip.id} type="button" onClick={chip.onRemove}>
              {chip.label}<span aria-hidden="true">×</span>
              <span className="sr-only">Remove {chip.label} filter</span>
            </button>
          ))}
          <button className="clear-chip" type="button" onClick={onReset}>Clear all</button>
        </div>
      )}
    </div>
  );
}
