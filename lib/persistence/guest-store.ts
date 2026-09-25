import type { Itinerary } from "@/lib/planner/types";
import { itinerarySchema } from "@/lib/planner/itinerary-schema";

const STORAGE_KEY = "italy-itineraries:v1";

interface GuestStore {
  version: 1;
  itineraries: Itinerary[];
}

// Reads and validates the browser's local itinerary store.
function readStore(): GuestStore {
  if (typeof window === "undefined") return { version: 1, itineraries: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { version: 1, itineraries: [] };
  const parsed = JSON.parse(raw) as GuestStore;
  if (parsed.version !== 1 || !Array.isArray(parsed.itineraries)) throw new Error("Saved itinerary data is incompatible.");
  return { version: 1, itineraries: itinerarySchema.array().parse(parsed.itineraries) };
}

// Lists itineraries saved on this device.
export function listGuestItineraries(): Itinerary[] {
  return readStore().itineraries;
}

// Inserts or updates one itinerary in browser localStorage.
export function saveGuestItinerary(itinerary: Itinerary): void {
  const store = readStore();
  const updated = { ...itinerary, updatedAt: new Date().toISOString() };
  const index = store.itineraries.findIndex((item) => item.id === itinerary.id);
  if (index >= 0) store.itineraries[index] = updated;
  else store.itineraries.unshift(updated);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// Removes one itinerary from browser localStorage.
export function deleteGuestItinerary(id: string): void {
  const store = readStore();
  store.itineraries = store.itineraries.filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}