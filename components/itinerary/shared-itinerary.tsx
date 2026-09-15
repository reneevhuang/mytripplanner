"use client";

import { useEffect, useState } from "react";
import type { Itinerary } from "@/lib/planner/types";
import { itinerarySchema } from "@/lib/planner/itinerary-schema";
import { ItineraryEditor } from "./itinerary-editor";

export function SharedItinerary({ token }: { token: string }) {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (token !== "local" || !window.location.hash) {
      setError("This share is unavailable or has been revoked.");
      return;
    }
    try {
      const value = decodeURIComponent(escape(atob(window.location.hash.slice(1))));
      setItinerary(itinerarySchema.parse(JSON.parse(value)));
    } catch {
      setError("This share link is invalid.");
    }
  }, [token]);

  if (error) return <section className="empty-state"><h1>Share unavailable</h1><p>{error}</p></section>;
  if (!itinerary) return <section className="empty-state"><p>Loading itinerary…</p></section>;
  return <ItineraryEditor itinerary={itinerary} readOnly />;
}
