import type { Metadata } from "next";
import { TripPlanner } from "@/components/trip-setup/trip-planner";
import { getCatalogFacetsForPlaces, loadPlaces } from "@/lib/catalog/repository";

export const metadata: Metadata = {
  title: "Plan a trip",
  description: "Create and edit a deterministic day-by-day Italy itinerary.",
};

export default async function PlanPage() {
  const places = await loadPlaces();
  const initialDate = new Date().toISOString().slice(0, 10);
  return <TripPlanner places={places} cities={getCatalogFacetsForPlaces(places).cities} initialDate={initialDate} />;
}
