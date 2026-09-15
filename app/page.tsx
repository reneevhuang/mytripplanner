import Link from "next/link";
import { CatalogExplorer } from "@/components/catalog/catalog-explorer";
import { getCatalogFacets, getPlaces } from "@/lib/catalog/repository";

export default function HomePage() {
  const places = getPlaces();
  const facets = getCatalogFacets();

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">CURATED ITALY PLANNING</p>
          <h1>Build days worth remembering.</h1>
          <p className="hero-copy">
            Explore {places.length} places across {facets.cities.length} cities, then turn your favorites into a
            practical itinerary with honest timing and clear booking warnings.
          </p>
          <Link className="button button-primary hero-cta" href="/plan">
            Start planning your trip
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
      <CatalogExplorer places={places} facets={facets} />
    </>
  );
}
