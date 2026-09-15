import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlace, getPlaces } from "@/lib/catalog/repository";

export function generateStaticParams() {
  return getPlaces().map((place) => ({ id: place.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const place = getPlace((await params).id);
  return { title: place?.name ?? "Place not found", description: place?.description };
}

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const place = getPlace((await params).id);
  if (!place) notFound();

  return (
    <article className="detail-shell">
      <Link className="back-link" href="/">← Back to places</Link>
      <div className="detail-heading">
        <div>
          <p className="eyebrow">{place.city} · {place.region}</p>
          <h1>{place.name}</h1>
          <p>{place.neighborhood ?? "Neighborhood not specified"} · {place.type.replaceAll("_", " ")}</p>
        </div>
        <div className="rating-block"><strong>{place.rating.toFixed(1)}</strong><span>out of 5</span></div>
      </div>
      <p className="detail-description">{place.description}</p>
      <dl className="detail-grid">
        <div><dt>Hours</dt><dd>{place.hours ?? "Unknown"}</dd></div>
        <div><dt>Typical visit</dt><dd>{place.duration_minutes ? `${place.duration_minutes} min` : "Unknown"}</dd></div>
        <div><dt>Price</dt><dd>{place.price_range}</dd></div>
        <div><dt>Booking</dt><dd>{place.booking_required === null ? "Unknown" : place.booking_required ? "Recommended" : "Not required"}</dd></div>
      </dl>
      <div className="tag-list" aria-label="Tags">
        {place.tagLabels.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
      </div>
      {place.seasonal_notes && <aside className="notice"><strong>Seasonal note</strong><p>{place.seasonal_notes}</p></aside>}
      {place.importWarnings.length > 0 && (
        <aside className="notice notice-muted">
          <strong>Planning notes</strong>
          <ul>{place.importWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </aside>
      )}
      <div className="detail-actions">
        <Link className="button button-primary" href={`/plan?city=${encodeURIComponent(place.city)}&place=${place.id}`}>
          Build a trip around this place
        </Link>
      </div>
    </article>
  );
}
