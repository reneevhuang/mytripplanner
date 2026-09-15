import type { Metadata } from "next";
import { TripPlanner } from "@/components/trip-setup/trip-planner";
import { getCatalogFacets, getPlaces } from "@/lib/catalog/repository";

export const metadata: Metadata = {
  title: "Plan a trip",
  description: "Create and edit a deterministic day-by-day Italy itinerary.",
};

export default function PlanPage() {
  const initialDate = new Date().toISOString().slice(0, 10);
  return <TripPlanner places={getPlaces()} cities={getCatalogFacets().cities} initialDate={initialDate} />;
}
